import geohash2 as gh
from decimal import Decimal

def geohash_encode(lat, lng, precision=9):
    """Mã hóa tọa độ thành geohash"""
    return gh.encode(lat, lng, precision)

def get_geohash_neighbors(geohash):
    """Lấy các geohash lân cận"""
    neighbors = []
    for direction in ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']:
        neighbors.append(gh.neighbor(geohash, direction))
    return neighbors

def convert_decimals(obj):
    """Recursively convert Decimal objects to float/int in a dict/list"""
    if isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimals(i) for i in obj]
    elif isinstance(obj, Decimal):
        if obj % 1 == 0:
            return int(obj)
        return float(obj)
    return obj