import json
import random
import string
from random import randint


def random_string(string_length=10):
    """Generate a random string of fixed length """
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(string_length))


node_count = 1000
link_count = 2000

data = dict()

nodes = []
for i in range(node_count+1):
    node = dict()
    node["id"] = i
    node["name"] = random_string()
    nodes.append(node)


links = []
for i in range(link_count+1):
    link = dict()
    link["target"] = randint(0, node_count)
    link["source"] = randint(0, node_count)
    links.append(link)

data["nodes"] = nodes
data["links"] = links
print(json.dumps(data))
