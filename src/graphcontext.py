class GraphContext:


    def __init__(self, data):
        self.data = data

    def set_nodes(self, nodesKey):
        self.nodes = self.data[nodesKey]

    def set_links(self, linksKey):
        self.links = self.data[linksKey]

    def nodes(self):
        return self.nodes

    def links(self):
        return self.links
