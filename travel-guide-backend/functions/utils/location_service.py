"""
AWS Location Service with DynamoDB Cache and Nominatim Fallback
Hybrid approach for optimal cost and reliability
"""
import os
import json
import time
import hashlib
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta
import boto3
from decimal import Decimal

# AWS Clients
location_client = boto3.client('location')
dynamodb = boto3.resource('dynamodb')

# Configuration
PLACE_INDEX_NAME = os.environ.get('PLACE_INDEX_NAME', 'TravelGuidePlaceIndex')
CACHE_TABLE_NAME = os.environ.get('LOCATION_CACHE_TABLE', '')
CACHE_TTL_DAYS = 30
USE_AWS_LOCATION = os.environ.get('USE_AWS_LOCATION', 'true').lower() == 'true'

# Initialize cache table
cache_table = dynamodb.Table(CACHE_TABLE_NAME) if CACHE_TABLE_NAME else None


def calculate_geohash(lat: float, lng: float, precision: int = 7) -> str:
    """
    Calculate geohash for caching
    Precision 7 = ~150m accuracy (good for city-level caching)
    """
    # Simple geohash: round to precision and hash
    lat_rounded = round(lat, precision)
    lng_rounded = round(lng, precision)
    key = f"{lat_rounded},{lng_rounded}"
    return hashlib.md5(key.encode()).hexdigest()[:16]


def get_from_cache(geohash: str) -> str | None:
    """Get location name from DynamoDB cache"""
    if not cache_table:
        return None
    
    try:
        response = cache_table.get_item(Key={'geohash': geohash})
        item = response.get('Item')
        
        if item:
            # Check if not expired (TTL is handled by DynamoDB, but double-check)
            ttl = item.get('ttl', 0)
            if ttl > int(time.time()):
                print(f"✅ Cache HIT for geohash: {geohash}")
                return item.get('locationName')
            else:
                print(f"⏰ Cache EXPIRED for geohash: {geohash}")
        else:
            print(f"❌ Cache MISS for geohash: {geohash}")
        
        return None
    except Exception as e:
        print(f"⚠️ Cache read error: {e}")
        return None


def save_to_cache(geohash: str, location_name: str, lat: float, lng: float):
    """Save location name to DynamoDB cache with TTL"""
    if not cache_table or not location_name:
        return
    
    try:
        ttl = int((datetime.now(timezone.utc) + timedelta(days=CACHE_TTL_DAYS)).timestamp())
        
        cache_table.put_item(Item={
            'geohash': geohash,
            'locationName': location_name,
            'lat': Decimal(str(lat)),
            'lng': Decimal(str(lng)),
            'ttl': ttl,
            'cachedAt': datetime.now(timezone.utc).isoformat()
        })
        
        print(f"💾 Cached location: {geohash} → {location_name[:50]}...")
    except Exception as e:
        print(f"⚠️ Cache write error: {e}")


def aws_location_reverse_geocode(lat: float, lng: float, language: str = 'en') -> str | None:
    """
    Reverse geocode using AWS Location Service
    Returns formatted address string
    """
    try:
        print(f"🌍 AWS Location: Reverse geocoding ({lat}, {lng}) in {language}")
        
        response = location_client.search_place_index_for_position(
            IndexName=PLACE_INDEX_NAME,
            Position=[lng, lat],  # AWS Location uses [lng, lat] order
            Language=language,
            MaxResults=1
        )
        
        if response.get('Results'):
            place = response['Results'][0]['Place']
            
            # Build formatted address
            label = place.get('Label', '')
            
            # Alternative: Build custom format
            # address_number = place.get('AddressNumber', '')
            # street = place.get('Street', '')
            # municipality = place.get('Municipality', '')
            # region = place.get('Region', '')
            # country = place.get('Country', '')
            
            print(f"✅ AWS Location result: {label}")
            return label
        
        print("⚠️ AWS Location: No results found")
        return None
        
    except location_client.exceptions.ResourceNotFoundException:
        print(f"❌ AWS Location: Place Index '{PLACE_INDEX_NAME}' not found")
        return None
    except Exception as e:
        print(f"❌ AWS Location error: {e}")
        return None


def nominatim_reverse_geocode(lat: float, lng: float, language: str = 'en') -> str | None:
    """
    Fallback: Reverse geocode using Nominatim OSM
    """
    try:
        print(f"🗺️ Nominatim: Reverse geocoding ({lat}, {lng}) in {language}")
        
        base_url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            "format": "json",
            "lat": str(lat),
            "lon": str(lng),
            "zoom": "14",
            "addressdetails": "1",
            "accept-language": language,
        }
        url = f"{base_url}?{urllib.parse.urlencode(params)}"

        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "travel-guide-app/1.0 (chaukiet2704@gmail.com)"
            },
        )

        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            location_name = data.get("display_name")
            
            if location_name:
                print(f"✅ Nominatim result: {location_name}")
                return location_name
        
        print("⚠️ Nominatim: No results found")
        return None
        
    except Exception as e:
        print(f"❌ Nominatim error: {e}")
        return None


def reverse_geocode(lat: float, lng: float, language: str = 'en', max_retries: int = 2) -> str | None:
    """
    Main function: Reverse geocode with cache, AWS Location, and Nominatim fallback
    
    Flow:
    1. Check DynamoDB cache (geohash-based)
    2. If miss, try AWS Location Service
    3. If AWS fails, fallback to Nominatim
    4. Cache successful result
    
    Args:
        lat: Latitude
        lng: Longitude
        language: Language code (en, vi, ja, etc.)
        max_retries: Max retry attempts for transient errors
    
    Returns:
        Location name string or None
    """
    
    # Validate coordinates
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        print(f"❌ Invalid coordinates: ({lat}, {lng})")
        return None
    
    # 1. Check cache first
    geohash = calculate_geohash(lat, lng)
    cached_result = get_from_cache(geohash)
    if cached_result:
        return cached_result
    
    location_name = None
    
    # 2. Try AWS Location Service (if enabled)
    if USE_AWS_LOCATION:
        for attempt in range(max_retries):
            try:
                location_name = aws_location_reverse_geocode(lat, lng, language)
                if location_name:
                    break
            except Exception as e:
                print(f"⚠️ AWS Location attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(0.5 * (2 ** attempt))  # Exponential backoff
    
    # 3. Fallback to Nominatim if AWS failed or disabled
    if not location_name:
        print("🔄 Falling back to Nominatim...")
        for attempt in range(max_retries):
            try:
                location_name = nominatim_reverse_geocode(lat, lng, language)
                if location_name:
                    break
            except Exception as e:
                print(f"⚠️ Nominatim attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(1 * (2 ** attempt))  # Exponential backoff
    
    # 4. Cache successful result
    if location_name:
        save_to_cache(geohash, location_name, lat, lng)
    else:
        print(f"❌ All geocoding methods failed for ({lat}, {lng})")
    
    return location_name


def forward_geocode(address: str, language: str = 'en', max_results: int = 5) -> list:
    """
    Forward geocode: Address → Coordinates
    Search for places by text query
    
    Returns list of results with coordinates and details
    """
    if not USE_AWS_LOCATION:
        print("⚠️ AWS Location disabled, forward geocoding not available")
        return []
    
    try:
        print(f"🔍 Forward geocoding: {address} in {language}")
        
        response = location_client.search_place_index_for_text(
            IndexName=PLACE_INDEX_NAME,
            Text=address,
            Language=language,
            MaxResults=max_results
        )
        
        results = []
        for item in response.get('Results', []):
            place = item['Place']
            geometry = place['Geometry']
            
            results.append({
                'label': place.get('Label', ''),
                'lat': geometry['Point'][1],
                'lng': geometry['Point'][0],
                'country': place.get('Country', ''),
                'region': place.get('Region', ''),
                'municipality': place.get('Municipality', ''),
                'relevance': item.get('Relevance', 0)
            })
        
        print(f"✅ Found {len(results)} results")
        return results
        
    except Exception as e:
        print(f"❌ Forward geocoding error: {e}")
        return []
