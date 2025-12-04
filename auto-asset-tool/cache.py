import json
from functools import cached_property


class Cache:
    @cached_property
    def _dict(self):
        from path import paths
        if not paths.CACHE.exists():
            return {}
        with paths.CACHE.open('r', encoding='utf-8') as f:
            return json.load(f)
    
    def save(self):
        from path import paths
        if not paths.CACHE.parent.exists():
            paths.CACHE.parent.mkdir(parents=True, exist_ok=True)
        with paths.CACHE.open('w', encoding='utf-8') as f:
            json.dump(self._dict, f)
    
    def __getitem__(self, item):
        return self._dict.get(item, None)
    
    def __setitem__(self, key, value):
        self._dict[key] = value
    
    def __contains__(self, key):
        return key in self._dict


cache = Cache()
