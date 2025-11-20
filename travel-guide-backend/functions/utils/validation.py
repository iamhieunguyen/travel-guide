"""
Input validation utilities
"""
import re

def validate_coordinates(lat, lng):
    """Validate latitude and longitude"""
    try:
        lat_f = float(lat)
        lng_f = float(lng)
        
        if not (-90.0 <= lat_f <= 90.0):
            return None, "Latitude must be between -90 and 90"
        if not (-180.0 <= lng_f <= 180.0):
            return None, "Longitude must be between -180 and 180"
        
        return (lat_f, lng_f), None
    except (TypeError, ValueError):
        return None, "Latitude and longitude must be valid numbers"

def validate_visibility(visibility):
    """Validate visibility value"""
    if not visibility:
        return "public", None
    
    visibility = str(visibility).lower().strip()
    if visibility not in ("public", "private"):
        return None, "Visibility must be 'public' or 'private'"
    
    return visibility, None

def validate_tags(tags, max_tags=20):
    """Validate and normalize tags"""
    if not tags:
        return [], None
    
    if not isinstance(tags, list):
        return None, "Tags must be an array"
    
    normalized = list(set(str(t).strip().lower() for t in tags if str(t).strip()))
    return normalized[:max_tags], None

def validate_string_field(value, field_name, min_length=1, max_length=None, required=True):
    """Validate string field"""
    if value is None or str(value).strip() == "":
        if required:
            return None, f"{field_name} is required"
        return "", None
    
    value_str = str(value).strip()
    
    if len(value_str) < min_length:
        return None, f"{field_name} must be at least {min_length} characters"
    
    if max_length and len(value_str) > max_length:
        return None, f"{field_name} must be {max_length} characters or less"
    
    return value_str, None