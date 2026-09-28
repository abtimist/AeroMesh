REGIONS = {
    "india": {"name": "India", "bbox": [68, 7, 97, 37], "center": [22.5, 78.5]},
    "brazil": {"name": "Brazil", "bbox": [-74, -34, -34, 6], "center": [-14, -51]},
    "china": {"name": "China", "bbox": [73, 18, 135, 54], "center": [35, 105]},
    "south-africa": {"name": "South Africa", "bbox": [16, -35, 33, -22], "center": [-29, 25]},
    "all": {"name": "Global BRICS", "bbox": [-180, -90, 180, 90], "center": [0, 0]},
}

def regional_query(query, model, node):
    if node and node != "all":
        west, south, east, north = REGIONS[node]["bbox"]
        query = query.filter(model.lon.between(west, east), model.lat.between(south, north))
    return query
