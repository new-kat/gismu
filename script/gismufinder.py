import requests
import xml.etree.ElementTree as ET

url = "https://jbovlaste.lojban.org/export/xml-export.html?lang=en&positive_scores_only=1&bot_key=z2BsnKYJhAB0VNsl"
response = requests.get(url)
response.raise_for_status()
root = ET.fromstring(response.text)
words = []
for word in root.iter("valsi"):
    if word.attrib.get("type") == "gismu" or word.attrib.get("type") == "experimental gismu":
        en = word.attrib.get("word")
        if en:
            words.append(f'"{en}"')

with open("jbovla.js", "w", encoding="utf-8") as f:
    f.write("const JBOVLA = [" + ",".join(words) + "]");
print(f"had {len(words)} gismu.")
