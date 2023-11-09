# System Summary

## NOTES
### BASICS:
You need to use the asr.ts file on speechstate to get custom speech.
If you have problems with the __JSON__ files, try running the python script to get them again.

### ON the process:
A Python script was made to retrieve info. This was initially thought as a replacement for an API, but this was discarded and using the script to download the data was the final choice.

### ON the last part:
For the last part ("check success strategy") I uploaded a code closer to the finish product in "voice-assistant-ffxii-new". However, it gets stuck in listen(). I don't know if it will work in other machines, but in mine it worked once and then didn't work anymore. Regardless, the code here is not really what the final product should be, but it works... Please watch the demo to see an idea on how it was envisioned.

> __Let me know if you have any ideas on how to fix that or those mistakes in "voice-assistant-ffxii-new" (because it's a shame that all that effort is lost).__

## Main Motivation:

The motivation for developing this system comes from the need of players in JRPGs games such as Final Fantasy XII to look for information about items in the game. Items are essential for progress and players may need to constantly check for information inside the game menus or online to check how to obtain them. Online we also find information that cannot be found in the game.
A helper dialogue system that can access this information can provide the player a better experience, since they will not have to look away from the screen.

# System functionality

## 1. Item information retrieval. Intent: "get bazaar or item info"

### Name of the item/enemy
Motivation: getting info of an item/enemy in a quick way is probably what we would like to do with the system.
Just the name of the item/enemy will get information. 

Try any of these:

- Mina 
- Whale Whisker
- Venetian Shield
- Nihopalaoa
- Bubble Belt
- Hyena

After recognition of item/enemy, the question: what specific information do you want to know about it? is posted.
Then, we give the info to GPT processes the info of the item and gives back an appropriate answer (although not always).
If the name is not recognized easily, that might be because it was not fed to Custom Recognition.
See all added items that were added to custom training in the file: FFXIINames.txt

### Specific info about the item/enemy


Here, the item/enemy is detected first and then the question itself is sent to GPT, which gives back an appropriate answer (although, again, not always).

Try any of these, also you can try reformulating the question:

- How strong is the weapon Mina/Whale Whisker, or, What's the attack for the weapon Mina/ Whale Whisker?
- Where can I get the Venetian Shield?
- What does the item Chronos Tear do?
- What effects does the accessory Ribbon have?
- How can I obtain the Zodiac Escutcheon?
- Where do I get Mud shot? Does it have any elemental attributes?
- Can you give me some information about the loot "Libra Gem"?


### Setbacks:
To ask about loot, if we say something like: 
"From what enemies can I obtain Libra Gem?" 
the intent designed for item info retrieval may not be selected, and the one for enemy detection may be selected instead. 
Also, related to Custom Recognition, if we don't feed it names such as: "Hell Gate's Flame" (name of some loot), it will not recognize as we want it to (it will get: "hell gates flame". This specific example could be tackled with, for instance, some regex.


## 2. Enemy detection. Intent: "get loot info"

Motivation: names are difficult to pronounce sometimes or we don't remember them, but we might remember what the enemy looks like and where we last encountered it.

Instead of giving the name, giving a description of the enemy and a description of the place it can be found will give back the enemy info we need. For example:

- "What can I steal from that enemy that is round and green and you can find it in the woods?"

Try describing the enemy and the place it is located in, and also try describing it but including the name of the specific location.

> See the video files to experiment with this. __try_for_yourself.mov.zip__

The logic for this part comes from the possibility of disambiguation between enemies thanks to the location, that is why the location is always required when we make the machine guess the enemy.
This is also helpful when the machine does not understand a specific name.

If the question includes the location, the guessing of such location is skipped. If the specific location is not included, the info is required and sent to GPT to guess location.
Then, once the location is established, a list of the enemies that can be found in the place are sent to GPT, together with all the enemies and their class characteristics.

Again, the characteristics are "Class" characteristics, and therefore, common to many enemies of the same class. However, the guessing works thanks to the aforementioned location disambiguation.
This is a bit tricky sometimes, because GPT will have to look at all the enemies, their classification and the characteristics of every classification, and is not always accurate.

Taking advantage of this possibility of disambiguation also helps in avoiding further creation of files and JSON objects.

### Setbacks: 
The features for every enemy class were limited, and so the detection is limited. Also, there are some errors related to context and assignation of utterances to it.

## 3. Battle helper. Intent: "check success strategy"

Motivation: sometimes we forget all the options we can use to defeat an enemy and we want some sort of support.

Trying to make the most out of the information we can obtain from enemies with minimum processing from GPT, which only gets intents.

It is a very minimal system that looks at different weaknesses of the enemy and gives them back in turns. The user is expected to give minimum feedback.

Try:
- How can I defeat Cockatrice?

You can also try enemy description, instead of the name, here.

- How can I defeat those big green enemies in the Henne Mines?

With the processing of intents the system is redirected towards one answer or another, those answers are based on the enemy information, but are limited because of the structure.
The basis for this experimentation was: how far can we get without letting GPT process the enemy information?
The machine is accurate but takes a long time to develop.
This part could constitute a whole project on its own.


### Setbacks: 
Short, limited, more options could be added so that the dialogue is much more fluent and natural.

# Improvements
NOTES: 
> I grossly underestimated the magnitude of this project. Now I see how it would have been better to select a small set of items, enemies and locations to work with.
> Time spent on Web-scrapping was too long.
> Because of this, multimodality was off the table.

- Please see __setbacks__ in every section.
- Prompts could be reformulated to get better answers.
- ~~Working with context in this system may cause some errors. Concrete ERROR: going back after asking about concrete item/enemy information (!!).~~
- Sometimes, intent detection fails.
- The system could have more fluidity overall.

# Future work
__Every enemy description with GPT4:__ I would love to implement description for every single enemy with the assistance of a model that processes images. This way enemy detection would be much more accurate.

__Multimodality:__ It benefit quickness at some points. For example, if you have the enemy information and want to know something specific, a simple click would be faster than formulating the question. Such categories being displayed in the form of clickable elements on screen would be a good implementation.

__Negation:__ Configuring a detection system for negation would not be a "great" improvement, because in natural dialogue we do not communicate by saying what we _don't_ want to do, but it would be an interesting thing to add, it certainly would improve "understanding".

_Thank you!_
