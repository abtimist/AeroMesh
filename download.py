import urllib.request
url = "https://raw.githubusercontent.com/ultralytics/yolov5/master/data/images/bus.jpg"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as response, open('/home/abhishek/Desktop/test_fire.jpg', 'wb') as out_file:
    out_file.write(response.read())
