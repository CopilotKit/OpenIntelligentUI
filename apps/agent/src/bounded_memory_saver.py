"""
Bounded checkpoint storage for LangGraph agents.

The default MemorySaver stores all conversation thread checkpoints in memory
indefinitely. On memory-constrained hosts (e.g. Render's 512MB starter plan),
this causes unbounded growth that eventually triggers an OOM kill.

BoundedMemorySaver caps the number of stored threads and evicts the oldest
(FIFO) when the limit is exceeded. Eviction is tracked with an OrderedDict
rather than sorting keys, so eviction order is correct even when thread IDs
are UUIDs or other non-chronological strings.

NOTE: This class relies on MemorySaver.delete_thread and on how MemorySaver
      stores threads internally.
      The langgraph version is pinned in pyproject.toml to guard against
      breaking changes.

NOTE: This class is not thread-safe. It is designed for single-process
      async usage (uvicorn). If deploying with multiple worker threads,
      wrap put() with a threading.Lock.
"""

import logging
from collections import OrderedDict

from langgraph.checkpoint.memory import MemorySaver

logger = logging.getLogger(__name__)


class BoundedMemorySaver(MemorySaver):
    """MemorySaver that evicts oldest threads when exceeding max_threads."""

    def __init__(self, max_threads: int = 200):
        super().__init__()
        self.max_threads = max_threads
        self._insertion_order: OrderedDict[str, None] = OrderedDict()

    def put(self, config, checkpoint, metadata, new_versions):
        thread_id = config["configurable"]["thread_id"]
        # Move to end if already tracked, otherwise insert
        self._insertion_order[thread_id] = None
        self._insertion_order.move_to_end(thread_id)

        result = super().put(config, checkpoint, metadata, new_versions)

        # Count tracked threads rather than self.storage: reading an unknown
        # thread (get_tuple/list) adds an empty entry to the storage defaultdict
        # that put() never tracks, which would otherwise count toward the limit
        # and force the thread just written to be evicted.
        while len(self._insertion_order) > self.max_threads:
            oldest_thread, _ = self._insertion_order.popitem(last=False)
            logger.info(
                "BoundedMemorySaver: evicting thread %s (%d threads tracked)",
                oldest_thread,
                len(self._insertion_order),
            )
            # delete_thread also drops the thread's channel values (blobs) and
            # pending writes, which hold the message data.
            self.delete_thread(oldest_thread)
        return result
