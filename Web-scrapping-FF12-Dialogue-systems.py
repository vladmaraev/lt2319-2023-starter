### Web scrapping for FF12 Dialogue system's project
import re
import os
import json
from bs4 import BeautifulSoup
from urllib.request import urlopen

### - * - * - * - * Our utilities start here - * - * - * - *

### Helper functions
### Getting genus, class and enemy info

def get_genus_information(website):
    ''' Gets a dictionary of the type {Genus: Class: {Enemy: {link: , features}}, and a list of enemies.
    Function: get enemy information from website.
    The website has different divs that represent different categories, we need those different categories.
    This opperates according to the current state of the website structure :/, no API
    Returns: Tuple -> ()[0] for dict, ()[1] for list, dict without links [2]

    FOR DICT OF ENEMIES AND LINK use [3]
    
    '''

    site2 = urlopen(website).read()
    soup2 = BeautifulSoup(site2, "html.parser")

    ### Eliminate unnecessary/interfering divs
    soup2.find("div", class_="toc").decompose()
    genusclasscontainer = soup2.find_all("div", attrs= {"class" : "mw-parser-output"})

    ### You need to index, even if you just have length 1, apparently it captures other stuff as a bs4 object...
    ## This si to get the relevant tags inside the main div of the page
    relevantdivs2 = genusclasscontainer[0].find_all(["h3", "h4", "li"])

    ### Getting the dictionary
    enemy_helper = {}
    current_genus = None
    current_class = None

    enemy_list = []

    enemy_nolinks = {}

    dict_of_links = {}

    for element in relevantdivs2:
        # Remove monograph info, cost of monograph and way to obtain it.
        if not element.find_all(string=re.compile(("gil|Check|Talk|speak|Affects"))):
            if element.find("span", class_="mw-headline") and element.parent.name == "div":
                current_genus = element.get_text().replace("[]", "")
                enemy_helper[current_genus] = {}
                enemy_nolinks[current_genus] = {}
            elif element.find("span", class_="mw-headline") and element.parent.name == "td":
                current_class = element.get_text().replace("Class:", "").replace("[]", "")
                current_class = re.sub("^ +", "",current_class)
                enemy_helper[current_genus][current_class] = {}
                enemy_nolinks[current_genus][current_class] = {}
            elif element.find("a"):
                # This works here because it finds "a" within nested tags (remember: <li> tag) of the current element, but the element is still nested
                # <li><a></li></a>remember
                enemy = element.get_text()
                enemy = re.sub("\ \(\w*\ ?\w+\)", "", enemy)
                enemy_link = element.find("a").get('href')
                enemy_nolinks[current_genus][current_class][enemy] = {}
                enemy_helper[current_genus][current_class][enemy] = {"link": enemy_link} #, "features": None}
                dict_of_links[enemy] = {"link": enemy_link}
                enemy_list.append(enemy)
    return enemy_helper, enemy_list, enemy_nolinks, dict_of_links


### Helper functions
### Get location info

def get_location_information(website):
    ''' Gets a dictionary of the type ...{} and a list of locations
    Function: get location + enemies in that location.
    The website has different divs that represent different categories, we need those different categories.
    This opperates according to the current state of the website structure :/, no API
    Returns: dictionary of location and enemies in them
    dict [0] and a list of locations [1]
    '''

    site2 = urlopen(website).read()
    soup2 = BeautifulSoup(site2, "html.parser")

    ### Eliminate unnecessary/interfering divs
    soup2.find("div", class_="toc").decompose()
    genusclasscontainer = soup2.find_all("div", attrs= {"class" : "mw-parser-output"})

    ### You need to index, even if you just have length 1???, apparently it captures other stuff as a bs4 object...?? or does it???
    ## This si to get the relevant tags inside the main div of the page
    relevantdivs2 = genusclasscontainer[0].find_all(["h5", "li"])

    ### Getting the dictionary
    location_helper = {}
    current_location = None
    current_class = None

    location_list = []

    for element in relevantdivs2:
        # Remove monograph info, cost of monograph and way to obtain it.
        if not element.find_all(string=re.compile(("↑"))):
            if element.find("span", class_="mw-headline") and element.parent.name == "div":
                current_location = element.get_text().replace("[]", "")
                location_helper[current_location] = {"enemies": [], "features": [], "connections": [] }
                location_list.append(current_location)
            elif element.find("a"):
                enemy = element.get_text().replace("\n", "")
                enemy = re.sub("\ [a|b|c|d|e|f]", "", enemy)
                location_helper[current_location]["enemies"].append(enemy)
    return location_helper, location_list


### Helper function
### Get equipment info

def get_equipment_information(website):
    ''' Get dictionary of weapons and their information
    Index 0 is for the dictionary and index 1 is for the list of equipment items/items
    '''
    site2 = urlopen(website).read()
    soup2 = BeautifulSoup(site2, "html.parser")

    ### Eliminate unnecessary/interfering divs (duplicated div in this case)
    soup2.find("div", class_="tab-pane").decompose()
    equipmentcontainer = soup2.find_all("div", attrs= {"class" : "card"})

    ### Getting the dictionary
    equipment_item_info = {}
    current_equipment_item = None
    current_info = None

    equipment_list = []
    for element in equipmentcontainer:
        current_equipment_item = element.find("h6").get_text().replace("’", "'")
        current_equipment_item = re.sub("^ ", "", current_equipment_item)
        equipment_list.append(current_equipment_item)
        equipment_item_info[current_equipment_item] = {"info": None}
        current_info = element.find("div", class_= "card-body walkthrough-object-body").get_text().replace("\n", " ").replace("· ", "")
        equipment_item_info[current_equipment_item]["info"] = current_info
    return equipment_item_info, equipment_list
    
### Get info from loot

def get_loot_information(website):
    '''
    Gets items loot information (structure is different from equipment sites)
    Loot dict -> [0], List of loot items -> [1]
    '''
    site2 = urlopen(website).read()
    soup2 = BeautifulSoup(site2, "html.parser")

    equipmentcontainer = soup2.find_all("div", attrs= {"class" : "card"})

    ### Getting the dictionary
    loot_info_dict = {}
    current_loot = None

    loot_list = []
    for element in equipmentcontainer:
        if element.find("div", class_="card-header walkthrough-object-header"):
            current_loot = element.find("h6").get_text().replace("’", "'")
            current_loot = re.sub("^ ", "", current_loot)
            loot_info_dict[current_loot] = {}
            loot_list.append(current_loot)
            ### Getting nested elements, because find() only gets us the first <dt> and <dd> elements that we need
            sub_titles = element.find_all("dt")
            sub_titles_infos = element.find_all("dd")
            for dt, dd in zip(sub_titles, sub_titles_infos):
                current_subtitle = dt.get_text().replace("\n", " ").replace("· ", "")
                current_subtitle = re.sub("^ ", "", current_subtitle)
                current_subtitle_info = dd.get_text().replace("\n", " ").replace("· ", "")
                current_subtitle_info = re.sub("^  ", "", current_subtitle_info)
                loot_info_dict[current_loot][current_subtitle] = current_subtitle_info
    return loot_info_dict, loot_list


##### trying to get mroe info about the enemy in the most efficient way possibleeee
def get_enemy_information_optimized(website):
    site2 = urlopen(website).read()
    soup2 = BeautifulSoup(site2, "html.parser")
    ## this has specificcally what we want though : <div class="wds-tab__content">
    div_parents = soup2.find_all("div", attrs = {"class": "wds-tab__content"})
    ### table headers <h2>, section headers (stats, level hp mp) and info values <section>, info labels <h3>, 
    enemy_stats = {}
    for div in div_parents:
        current_div = div.find_all(["h2", "h3", "section"])
        for element in current_div:
            if element.find("h2"):
                section_info = element.find("h2").get_text()
                enemy_stats[section_info] = {}
                data_label = element.find_all("h3")
                data_value = element.find_all("div", class_="pi-smart-data-value pi-data-value pi-font pi-item-spacing pi-border-color")
                data_value2 = element.find_all("div", class_="pi-data-value pi-font")
                change_values = ["Classification", "Abilities", "Items"]
                if element.find("h2").get_text() in change_values:
                    for label, value in zip(data_label, data_value2):
                        current_label = label.get_text()
                        current_value2 = value.get_text()
                        enemy_stats[section_info][current_label] = current_value2
                else:
                    for label, value in zip(data_label, data_value):
                        current_label = label.get_text()
                        current_value = value.get_text()
                        enemy_stats[section_info][current_label] = current_value
    return enemy_stats


### Update information with new information that is not on the website
def info_updater(alist, adict, subkey):
    '''update dictionaries with additional info'''
    for key, element in zip(adict.keys(), alist):
        adict[key][subkey] = element
    print(subkey, " updated!")

### Manual update
def update_class_info(genus_dict):
    '''This is NOT a "function" but I'm paranoid and in a hurry '''
    genus_dict["Avions"]["Cockatrice"]["features"] = ["round chicken", "flightless", "round", "small beak"]
    genus_dict["Avions"]["Chocobo"]["features"] = ["big chicken", "big", "mount", "sprint", "big beak", "feathers"]
    genus_dict["Avions"]["Diver"]["features"] = ["bird", "flying"]
    genus_dict["Avions"]["Steeling"]["features"] = ["bat", "small", "green, blue or purple"]

    genus_dict["Beasts"]["Coeurl"]["features"] = ["feline", "long whiskers"]
    genus_dict["Beasts"]["Dreamhare"]["features"] = ["fluffy", "round tail", "small", "bunny", "furry"]
    genus_dict["Beasts"]["Gator"]["features"] = ["big", "fur", "furry crocodile"]
    genus_dict["Beasts"]["Serpent"]["features"] = ["snake"]
    genus_dict["Beasts"]["Sleipnir"]["features"] = ["horse", "armored horse"]
    genus_dict["Beasts"]["Toad"]["features"] = ["big frog"]
    genus_dict["Beasts"]["Tortoise"]["features"] = ["headless turtle"]
    genus_dict["Beasts"]["Urstrix"]["features"] = ["giant owl"]
    genus_dict["Beasts"]["Wolf"]["features"] = ["wolf"]

    genus_dict["Giants"]["Behemoth"]["features"] = ["has a thick sword", "bull-like", "horns"]
    genus_dict["Giants"]["Headless"]["features"] = ["has a long sword or axe", "no head"]
    genus_dict["Giants"]["Slaven"]["features"] = ["only two legs", "no arms", "very big"]

    genus_dict["Insects"]["Mantis"]["features"] = ["mantis", "big bug-like creature"]
    genus_dict["Insects"]["Mimic"]["features"] = ["tiny", "looks like chest"]

    genus_dict["Fiends"]["Bomb"]["features"] = ["round", "explodes", "big eyes"]
    genus_dict["Fiends"]["Chimera"]["features"] = ["round", "human-like head", "feathers"]
    genus_dict["Fiends"]["Crystalbug"]["features"] = ["looks like save crystal"]
    genus_dict["Fiends"]["Gargoyle"]["features"] = ["has wings", "floats around", "gargoyle"]
    genus_dict["Fiends"]["Nightmare"]["features"] = ["mare", "specter-like horse"]

    genus_dict["Ichthian"]["Piranha"]["features"] = ["small fish"]
    genus_dict["Ichthian"]["Yensa"]["features"] = ["very big fish"]

    genus_dict["Dragons"]["Fell Wyrm"]["features"] = ["typical big dragon", "sometimes ring around neck", "sometimes wings", "very big"]
    genus_dict["Dragons"]["Plate Wyrm"]["features"] = ["bug-like dragon", "medium size"]
    genus_dict["Dragons"]["Tyrant"]["features"] = ["dinosaur"]
    genus_dict["Dragons"]["Wyvern"]["features"] = ["flying", "typical smaller dragon"]

    genus_dict["Plants"]["Cactus"]["features"] = ["cactus"]
    genus_dict["Plants"]["Golem"]["features"] = ["made from wood", "two arms and two legs"]
    genus_dict["Plants"]["Malboro"]["features"] = ["tentacles", "big mouth", "lots of eyes"]
    genus_dict["Plants"]["Mandragora"]["features"] = ["vegetable head", "tiny body", "big head"]

    genus_dict["Elemental"]["Entite"]["features"] = ["big round entity", "ethereal"]
    genus_dict["Elemental"]["Elemental"]["features"] = ["small entity", "ethereal"]

    #genus_dict["Amorphs"]["Flan"]["features"] = ["looks like pudding"]

    genus_dict["Undead"]["Ghost"]["features"] = ["floating ghost", "typical ghost"]
    genus_dict["Undead"]["Plate Wyrm"]["features"] = ["ghastly looking dragon", "middle-size"]
    genus_dict["Undead"]["Reaper"]["features"] = ["giant floating head", "arms like scythes"]
    genus_dict["Undead"]["Skeleton"]["features"] = ["skeleton"]
    genus_dict["Undead"]["Sleipnir"]["features"] = ["pale horse", "armored horse", "axe-like helmet"]
    genus_dict["Undead"]["Steeling"]["features"] = ["bat with complex wings", "red or black"]
    genus_dict["Undead"]["Wolf"]["features"] = ["ghastly looking wolf"]
    genus_dict["Undead"]["Zombie"]["features"] = ["living corpse"]

    genus_dict["Constructs"]["Facer"]["features"] = ["giant stone face", "face with horns", "looks like lamp"]
    genus_dict["Constructs"]["Golem"]["features"] = ["made from stone", "two arms and two legs"]
    genus_dict["Constructs"]["Guardian"]["features"] = ["earth-color stone"]
    print("classes updated!")



### Info to update
features = [["desert"],["flat land", "open area/plains", "sun crystals", "rainy season", "dry season"],["underground"],["underground", "cart tracks", "mine cart", "electricity"],["cart tracks", "floating mines"],["desert", "oil rig", "platform"],["demon wall", "building"],["flat green land", "open green plains"],["jungle", "trees"],["cart tracks", "advanced mines"],["snow", "snowy mountain", "snow storm"],["bulding", "teleport areas", "stone guardians"],["mountains", "occasional rain", "floating", "shrine"],["forest", "green trees", "flowers"],["beach"],["green plains", "clifs", "ruins", "palm trees"],["ruined palace", "underground palace"],["advanced foggy forest", "magic forest", "fog", "snow"],["mysterious city", "abandoned city", "transparent platforms"],["high terrain island", "high cliff", "water"],["tower", "many floors", "tall tower", "underground floors"],["underground cave", "cave with sand"], ["green plains", "occasional storms", "windmills"],["bog", "swamp", "marshland", "foggy"],["mist", "ruined city", "partly underwater", "medallions"]]
connections = [[{"Dalmasca Eastersand": ["Barheim Passage", "Mosphoran Highwaste", "Nalbina Fortress","Rabanastre"], "Dalmasca Westersand": ["Dalmasca Estersand", "Mosphoran Highwaste", "Nalbina Fortress", "Ogir-Yensa Sandsea", "Rabanastre","Zertinan Caverns"]}], ["Dalmasca Estersand", "Dalmasca Westersand", "Ozmone Plain", "Rabanastre"], ["Barheim Passage", "Lowtown", "Rabanastre"], ["Dalmasca Estersand", "Garamsythe Waterway"], ["Bhujerba"], ["Tomb of Raithwall", "Zertinan Caverns", "Dalmasca Westersand"],["Yensan Sandsea"], ["Giza Plains", "Zertinan Caverns", "Jahara", "Golmore Jungle", "Henne Mines"], ["Eruyt Village","Feywood", "Ozmone Plain", "Paramina Rift"], ["Feywood", "Ozmone Plain"], ["Feywood", "Golmore Jungle", "Mt Bur-Omisace", "Stilshrine of Miriam"], ["Paramina Rift"], ["Dalmasca Estersand", "Nalbina Fortress", "Rabanastre"], ["Mosphoran Highwaste", "Nabreus Deadlands", "Necrohol of Nabudis", "Phon Coast"], ["Salikawood","Tchita Uplands"], ["Cerobi Steppe", "Phon Coast","Sochen Cave Palace"], ["Mosphoran Highwaste", "Tchita Uplands", "Archades"], ["Giruvegan", "Golmore Jungle", "Henne Mines", "Paramina Rift"], ["The Feywood"], ["The Pharos"], ["Ridorana Cataract"], ["Dalmasca Westersand","Nam-Yensa Sandsea", "Ogir-Yensa Sandsea", "Ozmone Plain"], ["Balfonheim Port", "Tchita Uplands"], ["Salikawood", "Necrohol of Nabudis"], ["Nabreus Deadlands", "Salikawood"]]

### - * - * - * - * - * - * - * - * 

def main():

    ### Getting genus: tupled of dict and list, dict== genus: class: enemy : link, features.
    genus_website = "https://finalfantasy.fandom.com/wiki/Genus"
    #print((get_genus_information(genus_website)))

    ### Getting location: dict of location, values: enemies, features, and connections
    location_and_enemies = "https://finalfantasy.fandom.com/wiki/Bestiary_(Final_Fantasy_XII)"
    #print(get_location_information(location_and_enemies))

    ### Getting equipment
    accessory = "https://jegged.com/Games/Final-Fantasy-XII/Equipment-and-Items/Accessories/"
    weapon = "https://jegged.com/Games/Final-Fantasy-XII/Equipment-and-Items/Weapons/"
    armor = "https://jegged.com/Games/Final-Fantasy-XII/Equipment-and-Items/Armor/"
    ammo = "https://jegged.com/Games/Final-Fantasy-XII/Equipment-and-Items/Ammunition/"
    item = "https://jegged.com/Games/Final-Fantasy-XII/Equipment-and-Items/Items/"

    ### Getting loot
    loot = "https://jegged.com/Games/Final-Fantasy-XII/Equipment-and-Items/Loot/"


    ### Using our functions to create objects we will need in the project

    ### Getting genus - * - * - * - *
    genus_dict = get_genus_information(genus_website)[0]
    enemy_list = get_genus_information(genus_website)[1]

    genus_dict_nolinks = get_genus_information(genus_website)[2]

    enemy_links_dict = get_genus_information(genus_website)[3]

    ### Getting location and the enemies in them  - * - * - * - *
    location_enemy_dict = get_location_information(location_and_enemies)[0]
    location_list = get_location_information(location_and_enemies)[1]

    ### Getting equipment and item information - * - * - * - *
    accessory_dict = get_equipment_information(accessory)[0]
    accessory_list = get_equipment_information(accessory)[1]
    #print(accessory_dict["Opal Ring"])
    weapon_dict = get_equipment_information(weapon)[0]
    weapon_list = get_equipment_information(weapon)[1]
    #print(weapon_dict["Tournesol"])
    armor_dict = get_equipment_information(armor)[0]
    armor_list = get_equipment_information(armor)[1]
    #print(armor_dict["Lamia's Tiara"])
    ammo_dict = get_equipment_information(ammo)[0]
    ammo_list = get_equipment_information(ammo)[1]
    #print(ammo_dict["Mud Shot"])
    item_dict = get_equipment_information(item)[0]
    item_list = get_equipment_information(item)[1]
    #print(item_dict["Nu Khai Sand"])

    ### Getting loot information - * - * - * - *
    loot_dict = get_loot_information(loot)[0]
    loot_list = get_loot_information(loot)[1]
    #print(loot_dict[0]["Quality Hide"])

    ### Getting concrete enemy information
    wolf_link = "https://finalfantasy.fandom.com/wiki/Wolf_(Final_Fantasy_XII)"
    wolf_info = get_enemy_information_optimized(wolf_link)

    ### Updating information extracted from webpages with our annotations: 
    ### 1) features for enemy classes in genus_dict
    ### 2) features and connections for location and their enemies

    ### 1)
    update_class_info(genus_dict)
    update_class_info(genus_dict_nolinks)

    genus_dict
    genus_dict_nolinks

    ### 2)
    info_updater(features, location_enemy_dict, "features")
    info_updater(connections, location_enemy_dict, "connections")
    location_enemy_dict

    def create_enemy_encyclopedia():
        """
        Use enemy_links_dict to gather information about ALL enemies from their respective websites...
        May take a while
        """
        enemy_encyclopedia = {}
        for k,v in enemy_links_dict.items():
            info = get_enemy_information_optimized("https://finalfantasy.fandom.com/"+enemy_links_dict[k]["link"])
            enemy_encyclopedia[k] = {"info": info}
        return enemy_encyclopedia
    
    enemy_encyclopedia = create_enemy_encyclopedia()

    list_of_dicts_import = [genus_dict, enemy_links_dict, location_enemy_dict, accessory_dict, weapon_dict, armor_dict, ammo_dict, item_dict, loot_dict, genus_dict_nolinks, enemy_list, accessory_list, weapon_list, armor_list, ammo_list, item_list, loot_list, enemy_encyclopedia, location_list]
    list_of_dicts_names = ["genus_dict", "enemy_links_dict", "location_enemy_dict", "accessory_dict", "weapon_dict", "armor_dict", "ammo_dict", "item_dict", "loot_dict", "genus_dict_nolinks", "enemy_list", "accessory_list", "weapon_list", "armor_list", "ammo_list", "item_list", "loot_list", "enemy_encyclopedia", "location_list"]
    
    ## Directory of the script so it gets printed here
    script_directory = os.path.dirname(__file__)

    def create_json_files():
        ## Create JSON files iteratively
        for adict, aname in zip(list_of_dicts_import, list_of_dicts_names):
            # Construct the full path to the JSON file in the script directory
            json_file_path = os.path.join(script_directory, "FF12data-" + aname + ".json")
            
            with open(json_file_path, "w") as json_file:
                json.dump(adict, json_file)
        print("These are the file names created (FF12data-*name of the dict/list*.json): ",list_of_dicts_names)

    ### Get dem files (fire emoji)
    create_json_files()

    print(enemy_links_dict["Mu"]["link"])

    # print(wolf_info.keys())
    # # print(wolf_info.values())
    # print(wolf_info["Stats"].keys())
    # print(wolf_info["Statuses and immunities"].keys())
    # print(wolf_info["Classification"].keys())
    # print(wolf_info["Abilities"].keys())
    # print(wolf_info["Items"].keys())
    # # print(wolf_info)


if __name__ == '__main__':
    main()