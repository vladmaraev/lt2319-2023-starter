# [Lab 1](./lab1.org)

# [Getting started](./README.org)

# Lab 2
## In branch lab2-complex:
GPT is implemented only in the first listening loop.
The nature of the program is a bit limiting considering the potential of GPT, but it has been done this way for experimentation.
Full implementation for GPT require redesign of the program's structure (in progress).

## In branch lab2:
GPT is implemented to rephrase a string, simplest task.

# Report for Lab2
### EXPERIMENTS
The following experiments are done to test to what level GPT's implementation can replace the architecture of the program, starting from the data base, to extraction of entities and strings.

### 1. Simple request to obtain detailed niche information. _Conclusion: Not good enough._
### 2. Requesting entities from a string. _Conclusion: Not good enough if the entities are not predetermined._
### 3. Requesting the matching of objects in lists with those of a string. _Conclusion: Good._

----------------------- 
### Experiment 1.
Checking database.

The prompt consists of (1) plus (+) what the user asks: 

(1) 'Hey, GPT! In Final Fantasy XII: The Zodiac Age,' 

Temperature is 0 unless otherwise indicated.

### Q1. 
(1) + 'What can I steal from Wolves in the desert?'

A:
In Final Fantasy XII: The Zodiac Age, when encountering Wolves in the desert, you have the opportunity to steal the following items from them:

1. Wolf Pelt: This is a common steal and can be used for crafting or selling.
2. Wolf Fang: Another common steal, it can be used for crafting or selling as well.
3. Wind Stone: This is a rare steal and can be used for crafting or selling, or even as a component for certain quests or bazaar recipes.

Remember that stealing items from enemies is not always guaranteed, and you may need to try multiple times to successfully steal these items.

### RATING:
[Partial hallucination, Wolf Fang doesn't exist in the game]

### Q1. second try
(1) + 'What can I steal from Wolves in the Desert? Please provide the list of items'

A:
In Final Fantasy XII: The Zodiac Age, when stealing from Wolves in the Desert, you have a chance to obtain the following items:

1. Wolf Pelt
2. Wolf Fang
3. Earth Stone
4. Potion
5. Small Feather

These are the possible items you can steal from Wolves in the Desert.

### RATING:
[Partial hallucination]

**Q1 = temp 0.2** -> Same + extra information about the ability "steal"
**Q1 = temp 0.4** -> Didn't understand "steal", interpreted as "drop" / or other items that don't correspond (Teleport Stone, for example.)
**Q1 = temp 0.6** ->  We can see that it got more creative, but again invented completely false information. See (4), **Knot of Rust** sells for a very cheap price, contrary to what it says. (Avarage price for an Item is 50 gil, Knot of Rust is 20 gil)

"
1. Wolf Pelt: This is a common steal and can be used for selling or crafting purposes.
2. Earth Stone: This is a semi-rare steal and can be used as a crafting material or sold for gil.
3. Wolf Fang: This is a rare steal and can be used for selling or crafting purposes.
**4. In some rare cases, you may also steal a Knot of Rust, which is a rare steal that can be sold for a good amount of gil.**
""

**Q1 = temp 0.8** -> a bit more verbose. Items change during these different outputs but are never 100% accurate, one or more of them are always wrong.


### Q2.
(1) + What do skeletons drop in the passage?'

A:
In Final Fantasy XII: The Zodiac Age, skeletons in the passage can drop various items when defeated. Some common drops from skeletons include Bone Fragments, Dark Crystals, Dark Stones, and occasionally, rare items like the Death's-Head or the Dark Matter. It's worth noting that the drop rates and specific items can vary depending on the location and the type of skeleton encountered.

### RATING:
[Again, lack of precise information. This is what it should be: Bone Fragment, Dark Stone, and either Antidote or Iron Helm]


## Conclusion: We cannot rely on GPT for this task.

Comment: it would have been more difficult to check this task if GPT was a bit more accurate, but it manages to fail every time for the three items its supposed to provide information of.

----------------------- 
### Experiment 2.
Checking entities: we ask GPT to find specific entities in a sentence, the list of **_specific entities_** is provided.
Prompt (1) + user's input

### zero-shot
(1) 'Hey, GPT!  Could you please let me know if the following sentence request has any of these entities: Action: ${category.action}, Enemy: ${category.enemy}, Location: ${category.location} ?, this is the sentence: '


### Q1.
(1) +  'What can I steal from Wolves in the desert?'

A:
Yes, the sentence "What can I steal from Wolves in the desert?" contains the following entities:

Action: steal
Enemy: wolves
Location: desert

### RATING: 
[Success]

### Q2.
(1) + 'What can I get from Skeletons in the Mines?'

A:
Yes, the sentence "What can I get from Skeletons in the Mines?" contains the following entities:

Action: None of the specified actions (drop, steal, poach) are present in the sentence.

Enemy: Skeletons

Location: Mines

### RATING: 
[Success]

### Q3. 
(1) + 'What can I get from wolves?'

A:
Based on the given sentence, there are no mentions of any of the specified entities (action, enemy, or location). The sentence is simply asking about what can be obtained from wolves.

### RATING: 
[Failure. Couldn't follow instructions. This is the object "category.enemy" : enemy: ["wolf", "wolves", "gargoyle", "gargoyles", "skeleton", "skeletons"].]

### Q4. 
(1) + 'What can I obtain from skeletons?'

Based on the given sentence, there are two entities present: "skeletons" (Enemy) and "desert, jungle, mines" (Location).

### RATING:
[Failure.]


**Q1 = temp 0.6** -> A: same.
**Q4 = temp 0.6** -> A:
Based on the sentence you provided, it does not contain any of the specified entities (Action: drop, steal, poach; Enemy: wolf, wolves, gargoyle, gargoyles, skeleton, skeletons; Location: desert, jungle, mines). The sentence is asking about obtaining something from skeletons, but it does not mention any specific actions, enemies, or locations.
### Rating: [Also Failure]

### Conclusion of experiment 1: We cannot rely on GPT for this task with the current prompt.

----------------------
### Experiment 2.1.
Changing the prompt, adding examples to the prompt.

### 1-shot
(1) 'Hey, GPT!  Could you please let me know if the following sentence request has any of these entities: Action: ${category.action}, Enemy: ${category.enemy}, Location: ${category.location} ? 
**Here's an example:** 
**Example sentence: "What can I get from skeletons?". Entities: Enemy: skeletons , Action: None, Location: None.** 
This is the sentence: '

### Q1
(1) + 'What can I obtain from wolves?'

A:
Based on the sentence "What can I obtain from wolves?", the entities present are:

Action: obtain
Enemy: wolves
Location: None

### Rating:
[Failure. Improved in detection of enemy from last prompt, but "obtain" is selected as "action", which is not in the provided list.]

### Q2 
(1) + 'What can I get from Gargoyles?'

A:
Based on the sentence "What can I get from Gargoyles?", the entities present are:

Action: None
Enemy: Gargoyles
Location: None

### Rating:
[Success, but **"get" is in the prompt.**]

### Q3
(1) + 'What can I attain from wolves?'

A:
Based on the sentence "What can I attain from wolves?", the entities present are:

Action: attain
Enemy: wolves
Location: None

### Rating:
[Failure.]
-----------------
### Experiment 2.2
Putting a second example in the prompt.

### 2-shot
(1) + 'Hey, GPT!  Could you please let me know if the following sentence request has any of these entities: Action: ${category.action}, Enemy: ${category.enemy}, Location: ${category.location} ? 
Here's two examples: 
**Example sentence 1: "What can I get from skeletons?". Entities for example 1: Enemy: skeletons , Action: None, Location: None.** 
**Example sentence 2: "What can I obtain from Gargoyles in the jungle?". Entities for example 2: Enemy: gargoyles , Action: None, Location: jungle.** 
This is the sentence: '

_Reminder: temperature is 0._
### Q1.
(1) + 'What can I get from Gargoyles?'

A: 
Based on the given sentence, here are the entities identified:

Action: get
Enemy: Gargoyles
Location: None

Therefore, the entities for the sentence "What can I get from Gargoyles?" are:

Action: get
Enemy: Gargoyles
Location: None

### Rating:
[Failure.]

### Q2.
(1) + 'What can I obtain from wolves?'

A:
Entities for the sentence "What can I obtain from wolves?":
Enemy: wolves
Action: None
Location: None

### Rating: 
[Success, **but "obtain" was in the prompt.**]

## Q3.
(1) + 'If I want to steal from skeletons, um, what can I obtain?'

A:
Based on the given sentence, here are the entities identified:

Action: steal
Enemy: skeletons
Location: None

Therefore, the entities for the sentence "If I want to steal from skeletons, um, what can I obtain?" are:

Action: steal
Enemy: skeletons
Location: None

### Rating:
[Success.]

### Q4.
(1) + 'Give me information about the drop rate for skeletons'

A:
Based on the given sentence, here are the entities identified:

Action: drop
Enemy: skeletons
Location: None

### Rating:
[Success.]

### Q5.
(1) + 'What can I poach from wolves?'

A:
Based on the sentence "What can I poach from wolves?", the entities present are:

Action: poach
Enemy: wolves
Location: None

### Rating:
[Success.]

### Q6.
(1) + 'What can I acquire from skeletons?'

Based on the sentence you provided, here are the entities identified:

Action: acquire
Enemy: skeletons
Location: None

Therefore, the entities for the sentence "What can I acquire from skeletons?" are Action: acquire, Enemy: skeletons, and Location: None.

### Rating:
[Failure. Acquire is recognized as an entity in the list, when it is not part of it.]

### Conclusion of experiment 2: 
If the model finds a verb, it will get analysed as "Action", even when given the prompt to indicate that only specific verbs should fill that slot. 
The prompt has a list for every entity it should detect, preceded by its title (e.g. Action: ['drop', 'steal', 'poach']. However it keeps failing.

It looks like GPT has a its own definition of what an Action entity implies, and it is not wrong, after all the language model can pics on such categories.
If one does not worry about there being an error margin, the task can be labeled as acceptable. Otherwise, we can conclude that the model is not useful for precise simple tasks, or at least for given tasks. 

Whatever it is that the model considers predetermined entities could be explored further.

-------------
### Experiment 3
Changing the prompt: we are not looking for whatever the model considers "entities" now, but we ask it for a simple task: to find items of a list in a sentence.

### 2-shot, match items of a list in a string
Notice that the word "Entities" is now replaced in the prompt

(1) 'Hey, GPT! _Could you please let me know if the following sentence request has any of the words in the lists?_ : Action: ${category.action}, Enemy: ${category.enemy}, Location: ${category.location} ? 
Here's two examples: 
Example sentence 1: "What can I get from skeletons?". _Matches for example 1_: Enemy: skeletons , Action: None, Location: None. 
Example sentence 2: "What can I obtain from Gargoyles in the jungle?". _Matches for example 2_: Enemy: gargoyles , Action: None, Location: jungle. This is the sentence: '

### Q1.
(1) + "What can I acquire from skeletons?"

A:
Here are the matches for the sentence "What can I acquire from skeletons?":

Enemy: skeletons
Action: None
Location: None

### Rating:
[Success.]

### Q2.
(1) + 'What can I get from Gargoyles?'

A:
Here's the breakdown for the sentence "What can I get from Gargoyles?":

Matches for Example 1:
- Enemy: gargoyles
- Action: None
- Location: None

So, the sentence matches the Enemy category with the word "gargoyles". However, it does not match any words from the Action or Location categories.

### Rating:
[Success.]

### Q3.
(1) + 'I want to attain loot from wolves'

A: 
Here's the breakdown for the sentence "I want to attain loot from wolves":

Matches for Example 1:
Enemy: wolves
Action: None
Location: None

Therefore, the sentence matches the following:
Enemy: wolves
Action: None
Location: None

### Rating:
[Success.]

### Q4.
(1) + 'What can I poach from skeletons in the desert?'

A:
Here's the breakdown for the sentence you provided:

Matches for the sentence "What can I poach from skeletons in the desert?":
- Enemy: skeletons
- Action: poach
- Location: desert

### Rating:
[Success.]

--------
### Experiment 3.1
Slight prompt modification to get items in an ordered manner.

(1) 'Hey, GPT! Could you please let me know if the following sentence request has any of the words in the lists?: Action: ${category.action}, Enemy: ${category.enemy}, Location: ${category.location} ? 
Here's two examples: 
Example sentence 1: "What can I get from skeletons?". Matches for example 1: Enemy: skeletons , Action: None, Location: None. 
Example sentence 2: "What can I obtain from Gargoyles in the jungle?". Matches for example 2: Enemy: gargoyles , Action: None, Location: jungle. 
_Give me a list for every category._ 
This is the sentence: '
'

Q: 'What can I steal from gargoyles in the jungle?'
A: Here's the breakdown for the sentence "What can I steal from gargoyles in the jungle?":

Matches for Action: steal
Matches for Enemy: gargoyles
Matches for Location: jungle

Q: What's the drop for wolves in the jungle?"
A: Here are the matches for each category in the sentence "What's the drop for wolves in the jungle?":

Enemy: wolves
Action: drop
Location: jungle

Q: 'I want to know about wolves in the jungle'
A: Here's the breakdown for the sentence "I want to know about wolves in the jungle":

Matches for Action: None
Matches for Enemy: wolves
Matches for Location: jungle

Q: 'What do skeletons drop?'
A: Here are the matches for the sentence "What do skeletons drop?":

Enemy: skeletons
Action: drop
Location: None

**Comment: The answer changes its shape slightly, using the JSON format is the optimal solution.**

### Conclusion for experiment 3: 
When not asked about "Entities", GPT can be relied to extract specific information from strings provided a list of matching items.
The tasks tested here are limiting given the structure of our program, but the architecture should be adapted to GPT's potential for future work.
Further testing should involve intent recognition too.


