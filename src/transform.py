from .node import Node
from .link import Link
import numpy as np

countries = {}




def countries_to_json(countries_series):
    mapping = {}

    for country in countries_series.index:
        for x in country.split(";"):
            if x in countries:
                countries[x] = countries[x] + 1
            else:
                countries[x] = 1

    nodes = []
    links = []
    linksObj = set()
    included = set()

    id = 1
    for country in countries:
        mapping[country] = id
        nodes.append(Node(id, country, countries[country]).__dict__)
        id += 1

    for country in countries_series.index:
        if country not in included:
            included.add(country)
            splitted = country.split(";")
            if len(splitted) > 1:
                i = 0
                for i in range(0, len(splitted) - 1):
                    couStart = splitted[i]
                    couEnd = splitted[i + 1]


                    idStart = mapping[couStart]
                    idEnd = mapping[couEnd]

                    link = Link(idStart, idEnd)
                    if link not in linksObj:
                        #print(country)

                        linksObj.add(link)
                        links.append(link.__dict__)

    data = {"countries": nodes, 'links': links}

    return data

#eigl müsste es austragungsland sein mit target zum participants..