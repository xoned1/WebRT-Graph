class Link:
    def __init__(self, source, target):
        self.source = source
        self.target = target

    def __eq__(self, other):
        if self.target == other.source \
                and \
                self.source == other.target:
            return True
        if self.source != other.source:
            return False
        if self.target != other.target:
            return False

        return True

    def __ne__(self, other):
        if self.target == other.source \
                and \
                self.source == other.target:
            return False

        return True


    def __hash__(self):
        return hash(self.source) + hash(self.target)
