"""Small bounded TTL cache for serialized observation responses."""
from collections import OrderedDict
from threading import RLock
from time import monotonic

class ResponseCache:
    def __init__(self, ttl=30, capacity=32):
        self.ttl, self.capacity = ttl, capacity
        self.entries = OrderedDict()
        self.lock = RLock()

    def get_or_create(self, key, factory):
        with self.lock:
            entry = self.entries.get(key)
            if entry and entry[0] > monotonic():
                self.entries.move_to_end(key)
                return entry[1]
            result = factory()
            self.entries[key] = (monotonic() + self.ttl, result)
            while len(self.entries) > self.capacity:
                self.entries.popitem(last=False)
            return result

    def clear(self):
        with self.lock:
            self.entries.clear()

observations_cache = ResponseCache()
