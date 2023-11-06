import { createMachine, createActor, assign, sendTo, raise, fromPromise } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";
// Python script for FF12 data extraction
//import { get_enemy_info } from '../Web-scrapping-FF12-Dialogue-systems.py';
// Dictionaries with rich information
import genus_dict from '../FF12data-genus_dict.json'
import enemy_encyclopedia from '../FF12data-enemy_encyclopedia.json'
import location_enemy_dict from '../FF12data-location_enemy_dict.json'
import enemy_links_dict from '../FF12data-enemy_links_dict.json'
import accessory_dict from '../FF12data-accessory_dict.json'
import weapon_dict from '../FF12data-weapon_dict.json'
import armor_dict from '../FF12data-armor_dict.json'
import ammo_dict from '../FF12data-ammo_dict.json'
import item_dict from '../FF12data-item_dict.json'
import loot_dict from '../FF12data-loot_dict.json'
// Lists with items names
import enemy_list from '../FF12data-enemy_list.json'
import location_list from '../FF12data-location_list.json'
import accessory_list from '../FF12data-accessory_list.json'
import weapon_list from '../FF12data-weapon_list.json'
import armor_list from '../FF12data-armor_list.json'
import ammo_list from '../FF12data-ammo_list.json'
import item_list from '../FF12data-item_list.json'
import loot_list from '../FF12data-loot_list.json'
// simplified dict, instead of genus_dict
import genus_dict_nolinks from '../FF12data-genus_dict_nolinks.json'
import { mapContext } from "xstate/dist/declarations/src/utils";

// console.log(item_list) > > > perfect!

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "b7f17fcf06584fff85c25a0b297ddf00",
};

const settings: Settings = {
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 80,
  locale: "en-US",
  asrDefaultNoInputTimeout: 90000,
  ttsDefaultVoice: "en-US-AshleyNeural",
};

interface DMContext {
  spstRef?: any;
  lastResult?: Hypothesis[];
  act?: any;
  ene?: any;
  loc?: any;
  lootinfo?: any;
}


interface Categories {
  [index: string]: Array<string>
};

interface Concrete {
  [index: string]: {
    [index: string]: Array<string>
  }
};

interface Specific {
  [index: string]: {
    [index: string]: string
  }
};

interface BasicEntity {
  [category: string]: string[];
};

// * - _ - * - _ - * - _ - * - _ - *

// Search for API finalfantasy.fandom.com -> NO longer available :(

// To access a file, remember the name is: 
// "FF12data-" + aname + ".json" (aname = a name in filenames list)
// filenames = ['genus_dict', 'location_enemy_dict', 'accessory_dict', 'weapon_dict', 'armor_dict', 'ammo_dict', 'item_dict', 'loot_dict', 'enemy_list', 'accessory_list', 'weapon_list', 'armor_list', 'ammo_list', 'item_list', 'loot_list']

// To get enemy webpage info as a dict
// "https://finalfantasy.fandom.com/" + genus_dict["Beasts"]["Wolf"]["Cerberus"]["link"]
// This won't be easily available, therefore this API-ish feature is ignored
// Now, use enemy_encyclopedia instead.

//const text = "<speak xmlns=\"http://www.w3.org/2001/10/synthesis\" xmlns:mstts=\"http://www.w3.org/2001/mstts\" xmlns:emo=\"http://www.w3.org/2009/10/emotionml\" version=\"1.0\" xml:lang=\"en-US\"><voice name=\"en-US-AshleyNeural\" leadingsilence=\"50ms\"><prosody pitch=\"+5.00%\">Hi there!</prosody></voice>"


async function fetchFromChatGPT(prompt: string, max_tokens: number) {
  const myHeaders = new Headers();
  myHeaders.append(
    "Authorization",
    "Bearer <>",
  );
  myHeaders.append("Content-Type", "application/json");
  const raw = JSON.stringify({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0,
    max_tokens: max_tokens,
  });

  const response = fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  })
    .then((response) => response.json())
    .then((response) => response.choices[0].message.content);

  return response;
};

// helper functions
const say =
  (text: string) =>
    ({ context }) => {
      context.spstRef.send({
        type: "SPEAK",
        value: { utterance: text },
      });
    };
const listen =
  () =>
    ({ context }) =>
      context.spstRef.send({
        type: "LISTEN",
      });




var punctuation = /[\.,?!]/g;

const affirmation = ["Yeah", "Sure", "Okay", "Yes", "All right", "Let's do it", "Let's go", "Fine", "Agreed", "Okey-dokey", "Certainly", "Yup", "yep", "absolutely", "that's right", "let's try that", "let's do that", "OK"]
const probably = ["I think so", "most likely", "Probably", "Maybe", "probably yeah", "most likely yeah", "maybe yeah"]
const negation = ["No", "nah", "no, thank you", "nope", "Not really", "I don't think so", "probably not", "not really"]
const unsure = ["I don't know", "I'm not sure", "I'm unsure", "I don't think so", "I don't remember"]
const nuancedNegation = ["I'm good", "That's all", "It's okay", "I'm fine",  "It's fine", "That's enough"]
const thinking = ["hm", "hmm", "um", "umm", "uh", "uhh"]

const goodBye = ["Okay, see ya!", "All right, see you!", "Got it, bye!", "Got it, see ya!", "Okay, bye!"]
const firstOfAll = ["First of all, ", "For starters, ", "To start, ", "To begin with, ", "First, "]

const understanding = ["I see, ", "Yeah, ", "Okay, ", "Right, ", "Sure, "]
const notUnderstanding = ["Sorry, couldn't quite catch that", "Sorry, couldn't catch that", "Wait, what was that again?", "Sorry, what?"]
const particular = ["Anything in particular that you want to know about this ", "Anything specific that you want to know about this", "Some specific trait that you want to know about this ", "Something in particular that you want to know about this ", "Something specific in particular that you want to know about this "]

const whatElse = ["What else?", "Anything else?", "Next?", "Is there something else you wanna know?", "something else you wanna check?"]
const getItemPrompt = ["Wait, what was that item?", "Say that one more time, which item?", "What was it?", "Sorry, what's that item called?", "What was that item again?", "Tell me again, what's the name of that item?", "Remind me, which item are we talking about?", "Which item are we talking about again?", "One more time, what's that item?", "What's that item's name, again?", "What item?", "I'm spacing on it, what item is it?", "What's the name of that item again?"]

const dontGiveUp = ["Don't give up!", "You can do it!", "You got this!", "I believe in you!"]

const listening = ["...I'm listening", "...I'm all ears", "...Go ahead!", "...Sure!, tell me", "...Sure!, go ahead", "...Sure!, I'm listening"]

const whyDontYouTry = ["Why don't you try ", "How about using ", "What about using ", "What happens if you use ", "Try using "]

const letMeKnow = ["Okay, let me know how that goes", "Okay, go for it", "Great, see how that works", "Great, keep me posted"]
const checkOnYou = ["I'll check on you in ", "I'll ask again in ", "Talk to you again in ", "Will ask you again in", "Be right back in "]

const positiveFiller = ["...Okay...", "...Let's see...", "...Yes...", "...Right...", "...All right...", "...Huh..."]
const fillerWords = ["...Umm...", "...Yeah...", "...Hmm...", "...So..."]
const affirmativeFiller = ["Great!...", "Cool!...", "Awesome!..."]

const offTopic = ["Sorry, but I can only help with FF12 related stuff", "I don't think I can help with that", "If it's not FF12 related I don't know!", "Can't help with that, sorry!", "can't help, sorry", "don't know about that, sorry", "don't know about that one, sorry"];

const randomOffTopic = Math.floor(Math.random() * offTopic.length);
//console.log(randomOffTopic, offTopic[randomOffTopic]);

function getRandomItemFromArray(array) {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
};

const checkList = (utt: string, myarray: Array<string>) => {
  const sortedArray = myarray.sort((a, b) => b.length - a.length);
  for (const element of sortedArray) {
    if (utt.includes(element.toLowerCase())) {
      return true;
    }
  }
      return false;
};



const chosenItem = (context, array: Array<string>, caps: string) => {
  let utt = context.lastResult.toLowerCase().replace(punctuation, "");
  //let utt = event.value[0].utterance.toLowerCase().replace(punctuation, "");
  //let utt = "Hey, how can I get Antares ?".replace(punctuation, "");
  const sortedArray = array.sort((a, b) => b.length - a.length);
  for (const element of sortedArray) {
    const re = new RegExp(`(^| )${element.toLowerCase()}`);
    //if (utt.includes(re, element.toLowerCase())) {
    if (re.test(utt)) {
      if (caps == "no") {
        return element.toLowerCase();
      } else if (caps == "yes") {
        return element;
      } else {
        return "write if you want caps: yes or no";
      }
    }
  }
  return false; // Return false if no match is found in the entire array
};



// Check Success Strategy
const relevantStatus = ["Poison", "Slow", "Blind", "Sap", "Stop", "Disable"]

const getVulnerableStatuses = (dictionarykey) => {
  const dashStatuses = [];

  for (const status in dictionarykey) {
    if (dictionarykey.hasOwnProperty(status) && dictionarykey[status] === "-") {
      dashStatuses.push(status); 
    }
  }
  return dashStatuses; 
};

const getElementalWeakness = (dictionarykey) => {
  const dashStatuses = [];

  for (const status in dictionarykey) {
    if (dictionarykey.hasOwnProperty(status) && dictionarykey[status] === "Weak (200%)") {
      dashStatuses.push(status); 
    }
  }
  return dashStatuses; 
};

const getRelevantStatus = (anarray) => {
  const finalStatus = [];
  for (const status of anarray) {
    for (const filteritem of relevantStatus) {
      for (const finalitem of filteritem){
        if (status.trim() === filteritem){
          finalStatus.push(status);
        }
      }
    }
  }
  const randomRelevantStatus = getRandomItemFromArray(finalStatus)
  return randomRelevantStatus
};

const oki = getVulnerableStatuses(enemy_encyclopedia["Mu"]["info"]["Statuses and immunities"])
console.log(oki)

console.log(getRelevantStatus(oki))

const oko = getElementalWeakness(enemy_encyclopedia["Mu"]["info"]["Elemental affinities"])
console.log(oko)


// INTENTS Get loot info, Check success strategy, Get bazaar or item info
// I was gonna use this for the prompt, when detecting a single enemy: If the sentence matches any of these items (array with all the enemy names), put that name in the <intent> slot, but maybe its not a good idea
//const ItemEnemyLootIntentsPrompt: string = `Hey, GPT! Here's a JSON object: {"intent": <intent> }. Could you please let me know if the following sentence request has any of the intents in the list?: Intents: get loot info, check success strategy, get bazaar or item info, thinking ? If the sentence imply they are thinking about what they want to say, or if the sentence consists of an exclamation such as "umm" or "uhh", put <thinking> as the intent. VERY IMPORTANT: If there's no match, keep the intent empty. Put the correct intent in the JSON object. JUST ANSWER WITH THE JSON OBJECT, PLEASE. This is the sentence: `;
const guessIntent: string = `
This is a JSON object: {"intent": <intent>}. Please, classify the text according to the following 5 intents, bear in mind that we are talking about a video game, if the person goes off topic, mark the appropriate intent, if there is no match, keep it empty: 
"get loot info", "get bazaar or item info", "check success strategy", "thinking", "off topic".
To get the intents, please, try to follow the following guidelines: 
The intent "get loot info" should be selected when in the text they mention something about wanting to obtain an object from an enemy, but it can also include any sort of information about an enemy.
Please, select the intent "get bazaar or item info" when information about an accessory, a weapon, armor, ammunition, recovery items or objects is mentioned. I will give you a list with some of these objects down below.
Please, select the intent "check success strategy" when in the text they ask about "how to defeat" a specific enemy, "how hard it is to defeat" a specific enemy, etc.
The intent "thinking" is determined by hesitation, or by filler words such as "umm", "uhh", "hmm", etc. 
To analyze intents, please, break down every text into sentences (separated by commas or dots), consider what every sentence says, and then give back an intent.

This is the list of accessories: ${accessory_list}
This is the list of recovery items:${item_list}
This is the list of objects: ${loot_list}
I won't give you a list for ammunition, armor or weapons, I think you will understand that easily.

Some examples:
Text: "What can I get from Archeoaevis?". {"intent": "get loot info"}
Text : "Where can I get the Tournesol?". {"intent": "get bazaar or item info"}
Text: "How can I defeat Yiazmat? It's too strong.". {"intent": "check success stratey"}
PLEASE, ONLY REPLY WITH THE JSON OBJECT. DON'T USE QUOTES IN YOUR ANSWER. This is the text:
`;
// intents = get loot info, get bazaar or item info, check success strategy, thinking, off topic

// ENTITIES Get action, enemy, location TUNE THIS
//const ActionEnemyLocationEntitiesPrompt: string = `Hey, GPT! Here's a JSON object: {"action": <action>, "enemy": <enemy>, "location": <location> }.  Could you please let me know if the following sentence request has any of the words in the lists?: Action: ${category.action}, Enemy: ${category.enemy}, Location: ${category.location} ? Here's two examples: Example sentence 1: "What can I get from skeletons?". Matches for example 1: Enemy: skeletons , Action: , Location: . Example sentence 2: "What can I obtain from Gargoyles in the jungle?". Matches for example 2: Enemy: gargoyles , Action: , Location: jungle. Put the categories in the JSON object. If there's no match, keep the category empty. This is the sentence: `;
// INTENTS Decline question or go directly to new question/ if "yes + pause", confirm and go to new question
//const DeclineLootIntentPrompt: string = `Hey, GPT! Here's a JSON object: {"intent": <intent> }. Could you please let me know if the following sentence request has any of the intents in the list?: Intents: Get loot info, Check success strategy, Get bazaar or item info ? Put the intents in the JSON object. This is the sentence: `;


const guessTheEnemy: string = `
The following dictionary has 2 levels: "Locations", which is the first level, and and "features" which is located at level two.
Looking at the features for each "Location" entry, try to detect the place that I'm talking about in the sentence.
Sometimes the place will be explicitly given to you, and sometime you will have to infer it from the characteristics.
Give you answer back in the form of a JSON object of the form: {"location" : <location>}. 
If you can't detect any location, please, give back "unknown" as a value.
This is the dictionary: ${JSON.stringify(location_enemy_dict)}.
This is the sentence: 
`;

const guessTheEnemy2: string = `
The following information contains different genus, class and concrete enemies in each of them. You will see that the first level is the "Genus" (e.g. Avions), the second one is the "Class" (e.g. Cockatrice/Chocobo/Diver), and the third one is the specific "Enemy" (e.g. Sprinter, Brown Chocobo, Diver Talon...). 
Please, if you can, try to look at the sentence and provide the JSON object {"enemy": <enemy>} corresponding with the "enemy" that you consider is being talked about in the sentence.
To find the enemy, you will have to look at every "Class" section that says "features". Please, bear in mind that all the "features" are shared by all "enemies" in that class. 
Before you start, look first at the list of enemies provided in the "Location enemy list", your answer has to be one of those enemies, and to find which one of those it might be, you need to look at the information with "Class" "features".
Don't give back an "enemy" that is not in the "Location enemy list".
Please, give you answer back in the form of a JSON object of the form: {"enemy" : <enemy>}. 
If you can't detect any enemy, please give back "unknown" as a value.
If you want to answer something like "Dreamhare" bear in mind that it would be the name of the class, and not a concrete enemy. Don't use Class (second level) but enemy (third level) values.
This is the dictionary: ${JSON.stringify(genus_dict_nolinks).replace("{", "\n").replace("}", "\n").replace("\"", "")}
`;

//Difficult to recycle prompts

// about an item or an enemy. If I give you information about an item, please, ..., if I give information about an enemy, please give me a summarized information about the "Items".
const generateItemInfoAnswer: string = `
I have the following information about an item and I want you to, please, give me  summary of it. 
In the case that I give you a sentence requesting specific information, please, provide only the required information.
It is possible that the sentence says something similar to: "nothing in particular", "not really", "just general information", etc., or that you receive no sentence at all, in that case just stick to giving a summary.
Please, start with the name of the weapon (at the beginning of the "Information"), then the name of the "License", for example, for: "License: Koga Blade and Mesa" the name is "Koga Blade and Mesa".
If you get information about the bazaar, for example: "Bazaar: The Sunflower", say something like: "The name of the bazaar PACKAGE is The Sunflower".
If you are given a weapon, the value for "Stats: " include "Attack", "Evade", and "Combo Chance".
JUST ANSWER THE QUESTION, DON'T GIVE ANY OTHER SENTENCES, PLEASE.
If you consider the sentence to be unrelated, say: "Sorry, what information do you want to know about the item again?"
Information: 
`

// Used in ProcessGPTEnemy
const generateEnemyInfoAnswer: string = `
I have the following information about an enemy and I want you to, please, give me summary of the section that says "Item dropped", "Steal" and "Poach". You don't have to be particular about the percentages, just give a summary in one sentece for each section, please.
The information has to be only about the section that says "Item dropped", "Steal" and "Poach", that should be your default answer.
However, in the case that I give you a "Sentence" requesting specific information, please, provide only the required information.
It is possible that the sentence consists only of the name of the enemy, for example: "Pyrolisk", in that case, just stick to the initial instruction.
If the sentence is asking "where", try to see if the question is asking for "Location".
JUST ANSWER THE QUESTION, DON'T GIVE ANY OTHER SENTENCES, PLEASE. Also, you don't need to be too formal.
If you consider the sentence to be unrelated, say: "Sorry, what information do you want to know about the enemy again?"
Information: 
`

const checkSuccessStrategyPrompt = `
The following sentence is related to a video game.
In the sentence, they will probably talk about an enemy in the game. 
I would like to ask you to, please, select one of the intents that you consider appropriate for that sentence in the form of a JSON object {"intent": <intent>}.
Bear in mind that this is a conversation, so, if the sentence says something like "Okay" or "Sure", that just means it's an affirmation. 
If you detect the sentences implied that they are "fine", "doing well", "all good", "everything is going smoothly", and similar instantce, please, select "wait" to indicate that they don't need help right now.
If you notice emotions such as frustration, you can categorize that as "negation".
If you think that the sentence implies that they are "finished", they "are done", they have "defeated the enemy" or similar instances, please, just use "end".

These are the intents: 
- "too strong"
- "ask recommendation"
- "too fast"
- "negation"
- "affirmation"
- "wait"
- "end"

Sentence:
`

// remember to use counter for more realism in dialogue: if something already has been said, then +1
// {
//   cond: (context) => context.count == null,
//   actions: assign({
//     count: (context) => 0
//   }),
// },
// {
//   cond: (context) => context.count != null,
//   actions: assign({ count: (context) => context.count +1 
//   }),


// machine
const dmMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QCcD2qAuA6AIgSwEMAbVKAVzAFkCA7AmZLABWTAAcDWBiAQQGUASgBUhfAPoCAojxwBNANoAGALqJQbVLDwY8qGmpAAPRACYAzAEYsi8wBZFtgKwAOAOyuAnGdsAaEAE9EC1czLGcPE0cokw9HYMsAXwS-NExcQhJyKlp6MEYBMAIIfywAcVYwHRooLj4maQBpMQBhAHlKJgAZSSFJJVUkEA0tHT0DYwRbW0isR0UPRQA2Z1sLR1sPRb9AyciTLFcLN0OQxccTEySU9Gx8YlIKajoGLAKikp5YAGtKMB4afwYAAWeGqtXqPCabQ63V6-QMw20un0gwmtk8+y8FgsimcFkWHlsZlc20QRJssymZhiC2CcSuIFStwyD2yzzyr0KxSwny+pSYQi4UjapQAcgBJPiSHDwwaI0Yo0ATCIbLARMzORweWKWXwBMmrRwHVy4xzeea2RZmBlM9L3LJPXL5Lkfb78wXC1piyXS+QWAbqTRIsaoxARLVq8ya7Vmix6nbTIlheaKJZxRQ45w2m52zKPHIvN7cgBCYAAZqhWAUAMakGh4ABeYEkNB0Ojg4MaLXaXR6fRUCKDCvGiFcSYsJkWJmcGvc+MUjlJCDNoUW6MO6M1JimrmzaTuebZTs5705tag9abLbbeA7ssDI2RI8m9iNcwWy0NGy2+oQJk8VhHBsRxmjE9LJIyOYHqyjqFi6Z51o2zatkid7+oOj4hkqo5WlgE5TjOxzzouv7OM4ixYJaZEuOERIbnuzL2vm7LOqeNaIVeKHtrAXDyCYAZDEOT6hgg7ihPh06zociwLku2LLFgZhTguE7OJOhKXBBtrQQ6BYckWJTsReSHXqhPHyGYAnysJ2GibhEmEXOMkkTs8T7CcKlxN4HiuIsDG5jBemsdyRmXshN53rYVlCVhRijmaeGTpJRHOUunhvq4jiLNlcwyRstj+TpzHHgZCHGZxEXmY40WYYqcWiSEiUEVJxFyU4ihhFGWoTnEmW7lpUEsrpLEniFYDnmFpncbxiw1cGdUTJl4lJY50myb+JgZrYWCLDi25mLSamKP11z7kNxVwWx40ceFZm8a4c3DiJB0URs5HEmO6VTm1BJYNumzvecZgHYV51Hpd3I4HoGAAKo0BAeSwBgtAQJ2kLdjCfb3oJtXPmRM6Roos42Ca1JyW47kEt4iwmmOSx+QNZ1MeD+nwe6YighgYCtlwEB6GAWCggAbqgXwC9pYOwazp7s5z3MYAgwuoNWBAKv02PWbFEzA69Hjve46KxN9G0eBYHizHGVpAY47geKDzNS8FJSy628u8-zgs0CLYtYBLDtBaNzsChzrutorXvK6ryLq+hcoxQtZJLJRetWgbX0mHJYF4W4ZqbDiZsM6djGHo7gdlMHcs83zNAC0rPt+yXAelS7XNh0rKtqyofGPTZ9WrLr+ufUbGe-vnoQxES6IXEcITWozxeBSNzcV6HGDuzXnve+Lg3+0vbMr63Cvt1Hejq5ZGHzc+xID6nQ9ZSPrnRpSkQHSs8zaoXkFM43e8ywfbvV1rhHeuO8f4lX3kIEOh9w4iw7tHLuUUL5PVsv3ZOg9Db3yXGuDqcxPBTimOcacBV54BWGuAv+kDK5r0AZvUW29v6L3IdyFu8sYGR07soeQ1UkG921uRNBt8MHG1cjbVwO0NjeDHOcGmZx7ZgIhkHShq915AK3r7UBjCFHlyUdA4+HD5CzR4VrRASkb4fSEQ-UwcYrBEhttSC4XgLhyM0dLZh-8q4ezrvQheZCtEsLbhHOBp8u4PSMQnBAlgzFp2HkuS025FL4n7tiNwdsSFFRZk7bRUCAGeOAd40hF1XGKOyQE2BJ8aDq2cD3YxETJwCPMenWJE4rD-jMOsIm-4nBzyLgUjJZd-HUNyWohuLjMkDLYUEipXcPDVPCdTep0TMEbSnBRbErgTBxinhYMwDhnG+KKVkqhKjaEgIYfssZ7ij6BPKTHAccdcbPSygsu+wjTCThwYcOMRN3xrkcHswpFydE5I3l49RZyAX9MuRMm5XdsSzKvknN6gjGm-g2GOHa8xsRZSODJLMaTJZNwgSUwZIK8lgp8RC5eQLSnsPgZwic8KRIxCiS8yxy5IjOGsEsXE2pbDkXOH8-Fu8mHFKOTQ0FIzzmQupVcsp+jtmMtstOFlFilxmgcGEHZ1ISZ4mBoKnp6TS5UrECQSZPJvidFpXoNGUIeywn7Iq+qAqKLuE1BmTY6J8RLm3L9GRm0yKbVcG4f5fTjWmvKVgToeAkbc0tZMoUkgRQSilDKO5D5L4iWxRROIawlKk2yiSDalorAaW1JYOYZEiYhqNUS8NCosClgrKwUoFBYCwDjeUm1GNexwjTTjDNtks0W1zTTImBbvXUgohmbK6kg2OOIQaglv83GQLrciMorb21WpoMciVGipVhu3RuuAW7JnQv0X2zW4S+UzE-J4NpuIFyFp2JECkhJPCYv9TbathKKEmqPS2k9HaFS7rJZKyltaAObuA8ic9dK-SOrRDJQC5E1g22Q6mFyphU54WCBsncGydkLq-hS0NkGzWAbbTB614qwP7og3+tdehj1Ue3XB4JnD+JhOfDeo0d6vAVqfd6pwqzzA0xSds3yP7l3FO5mAAAts7TdLYFP+FA8M+jZG-1ycUyx2AKnFPsamZwy98c8YHT+nrTMRMzY23jCY1Y+wspRGWASOIsR9Ukd6TW7TNddOUf035tTtGNPgq0yusQOmlMnoM-4IzMdEOIBnObGIeJH2WFiGOJcB11iarXHy1MwFtnSZFVkqLenYvqboeS7zv6IvlYC7F+LXcuP3IHX3aYb4UyfjWN+bL2J9jAyDQQ3yOInAlb8cHBrymgtVdOaRnz9WgsVaC81zh582vII6zMd8SwVi9c2LEy0KW+VeHcFqaYn9wPhdk8txrs2QvVeu4t27qmVuqbW-IRBm3eFkiUl1j8+31iHd-O+UI5wJw7KDcDdEE2Dns2mzFh7QynuaZe2Vu7M2Pt6Pg9wn7NS6IA721+EHCY0uJU6784GNg4eAsi5jpHqm5v5MNXV17-mseGZxxxgxiWXw7e60DvrqKeV4UuzYRJWrafSvp29uGXwaCoAAO40Eq3ULs0Ie0Ou4yJOMURFJ63sL5ak5EvDZaJKETUE5fLuF8kTE6XnWcyYx29vgyNkAYFaELPIXbNf2o1mZplKYwg00ttOOkM5ssrAojOTa+IVj-g2Q757bOXe6bd3gIgRB5eK5V2riEtrMa9r5xPI0RJMzLDze+7LBIxHqnOHyryRJNKLuFZNyB5Xmh6DLHgZA8m3ecE9975ACak0+lTXzqYAvAck5-AmNpg2CT43pj5PFrf5Hw6m8trvNAe994Hx7r3PvPTehTQhnXSr0TiSWEG9wDgzb2YibXyMC-G-bOb9L41nfu+9-7+7ofx+iaXoyavorW6aW2Ew24jUOI4md+qwhIUelomqcen4iewQn+RK5WrQXwBA-gnQlQsAB+ABI+6u6MfuWMpmDyKCnWswgus+sSOyTmVINIGYmUGBvmb2O+e+8m1GO6J+IBE+F+9U5o201IFu2ICwpsxINevkswXgNMsQhIZE7BS2nBP+fevBo+wB4+5++O4SpelElguIleCh6I2WUQ20k4r4LgMkGya+juS6pWCO2+6hPB26Whp+oBfOIhik+0lgZsmK0hv43g0wXKwQU404EOawKh7OJQXBv+mh-BOhG24Bv2ES9gohfhEhgRz6Ji6yr0Zs5g7gGGbBQqG+dO5WAAYpWPJmQEQKrGALwfgGWGWHkPLEQGpqQYXlrgHlQR1guLQTPgdnPqYO0opFqEpGOu4OYDEWniUNUX3nUQ0bFs0a0awK2B0b7nahQd4YSNtPHjYBkeEOqObqEamOERcFuBOLMc4W9lGjGqrkFjwFAAQKCB4QIb0e1trHrEaJOPtgnsdDOLkbUjTJRAuLYkGrtJsDcVvmobvr-vnhrtscXkIRMD1ObOstsptNOGpGuNlnrObMBI3jOBqLDmUaMjLuVjwNWNWOwBgJVkkWfpQV8QaNPsTsMfieEMnHGJqCSSsMnmjqnrcbptSbSWwPSbNoyb6LHKkQTjQbtj1sDiMZMETObJYCaESNqAsJlMRins7sKR8DSXSQyUAZ4TKGAf2hAUEGcFYMdMDmip9JaFHjsmqE4F0sDPtt0g4W3pvh3stvgBAK2HDAjMgEjCjFsUXtrnoVfHsXhMsIcQ4MceYM6VYK6pCaHmOFdoKc7nwGwIUHyAKKgGQBgGwMWRGT0cyVaQgDyWIhHqmASKmAdHJGsINlqJ6WpHrjcZUAAOqFAaA7pdHdr+6VlpEV47S7T5TTg+RUhLhuAdT8nTA8libkRdkYA8B96VjlnDl844ibDjlxgaThBjhEhyQ2Ax5TybjohzDfrkkHpsyVA8DybyaoBbk7GolBDGH7mTlHkzmjwhD7A8krDTDrLohLCrmiknqVidEF5DlvnRm67HQUTZQHnTA-knm-hnDbTcqHBmjhDZRVq3kMbMKVDihczyavkonwW2S7lIUTmHnTlOBtRzB-TRBEih6sGrmWqYAUVRmynhLOTmyiLhDXnLDYjepbTWDTBjr4X3oClhbo6lCVBcUYDii74vmDnkGUV8U8bkQdQ7LHRmyHA+SeD9Y4iaqHDOBphqSJCEU3bMBoC0ltrug8gAjAighQCSBECwBgCkUKY8WfFVlL5iLtJgTqROmjybCW7LCTizy8kxCzEsDKwnrOWqVIjEAACKraIGGlyJvFlpaRQawQYQ5w5EwEVo2ock6wnKWUmwhIaYG4up2ZpWiVjlsAzlvIilNcyAxA7xOhI5NSmoSkO0yqOcbmywckq+1glau0gJNg9hepzVDlyVAo5qfIcm3VRAvVZ+Mp+VNSIQ6If0RuFMGY0Y5ME4eENglgDiwMpsWZ8lqeLVy1QgDa5YlYfw3wlRmeXMyA7o-l-V4ShVYiW4pVt1B0Hg5M3gYQ+MZoNVNujV91zuj1TlK1vIn1RA31v1UpghVF9UeI7gswK4WUKwKSzgck2UnKU+U4wQllloUwCVS1yNz1aN31qlFYv1j282tWiNDNbVK1zNeQrNqA7on2-1eMRwnKtu2ymKa4GyckxIHUkQDeea+cclC2D1PNzluZ+Z-NyArQxZpZa8OVkZAVaRa4CwO02y8kOILg0wZNpsf0MQ+IOyRN9gLe3p5RZcSNvNz1WtBAXwOtetJZZZRtPRO1V6z4ZtHUu0-hM1NtbKBcUV1lllllKc8Nat3NSVjNsWLlgIII1Qnl3liJZBuVJtNSLg8wlEY48emw0VNecYlI+Rlo9MbtC1WiXt7o2dHV61PVWNpd-FywYiBlb8fKc5Zg2WY44Ok4Wo6kUBadXNi1md3tndbo3dm1vdYdgetku0v06wLgmyuIGW5h+N6wMBmw8wzK9Ni9Hdy2qNX1eQ19TOvdotIkGGswFw9gesm0Aq5ukN3gZsIEk4YNqt89bdGtAo2dOtgtD9imzONWTuC9rV0D8xd9yAUD4Dq23OxmfdEdUOlEGwcQ9gu0llFg2WMVYJ6wbSkJBcl9iD6DrueZftAd+twdMFmleV4dmajtikbSdVvkla4NwRTgtZ04MQC4k4olwD8DoDV9dD6eDD-tKDgdBt-lG9fREw5w9teqvDywKddd206wjdMkyF0Jtl6OzQtAsgRZpYlAb1Wt1YeAPe1Yf1k+EQVg70GopJpopNIubg4iX9u5OFKwsxQgftYAljZAyAQgeA8mYAzj75kw6UkltMHmk4sS0elEVs-q+FwapjqelRlRE4rQNAHRTARAhQ3lcTONaI96UN+IoEwQLZaqE45sulWJuqDgLdTVWiXedRgZGA5jGA1YQIQgQIqslT2lIkx5CSx5RCps2IY9oOk6uGE5zS1u0RuTzu4oPB0arc7l4zu14S4Y5s6o0YOocYDBZwrpdmPqY4mwnmrdBy-wud7lBdsTId258TZEmUDt6kEQmU41EVQaU1llM1Qac1c9pQMM4ozAuQlqRQkAXAzQnQ4ozQDQ2DTKe5zSC46YSkjeCzOwUQxIao6yc1F2qc-kkL0LqlBA1YOg3uvAggIg4gUgMgCgz9SqBM79E4j6fK2CwJNhYiu0Jom05NhIFLULPItLeA3uWA4oEAZTXATLYgfAQgPAwgvo7Lwh51psGIawfz04wJVoakFsJouK3kNOJClLkrdLAscrCr-AAgyrqr6r2NEztkV1aowQrj096ybgWC-4tZq+nSCw2481OYVr1JNrWAvtXwez7zcFbrWrmIXrGyPrBrWCwM+wBIawZ5BINMXptoEbUrMr9xuzYIT93huWJ1KYgDSwX9-r-4ik6y6k1IcwZsSQEEiuCM8AgwTI8TAAtP+EuIO3PVI3kPE7LRhaEPYo4lTNTniNLiwOwJwGAPE+spVVHU4PyhqNlNvQW100UvEwSAwZyh6pZTrOENbjcRUFUFAPE5Es8qqqig4pXf6kcNOBmBYLMbyL8E825dUPE3EqsqhlEHbjiOtAmP+Clj5OVWWuYLEN+26AKPEwsJqGqKmFGJdXHrElB5ZsblqdSDlrMY2m9aFCZFxLeD24m8qDDTtK4-THm-i4gNIn9McJMREbYrMWRxVGZPEy5tYGNhCZ0tlD9LWWbeRMsCnAhxs6VlDEGfDIjMjPDJ858nhNqMdPtdc+TKqIQuIRTGcPuwjU4ZcvE2slglyVEDbDPJlHjXdencZ6utuoBzRNnLtKBxhhB1YvXbOjJLbNRDCY52aryLwXx-MGIplO+CEL5CcUWkgdMHVUY71tlAF-+maqW7Gk51U8x0I5RJZ+EDso4myj6jYriZlNuFPV+zJ+3qlxGiR82tBpl9R8x3jdnORNuIma0hOkcDtFlJdvtc03ZyA76TV-WgFiF1l5MFaMB25+hhmJht6nHnIYA1ITbl4Cl1Fnx-bZ4O+uC+cWypYJZVNeYDw-TOtwzm2rFkexZtt6BUQnt+bkTH49MLi0GllGd3LjQArsro8apqZ4nuh-iPiBqV-VhukWZXlDYabufYN2OxUctkQUfsgKZxEOecSP3F4Ge1HsdHR5qPAY+tqJI44dV+Vhnlnjnt95dxN50pyjnETFPsTsqXmttDIjON+dSO97pvEfvv-ojxO1w+sM90pIA1N1HuYLMINS24uRzyUNgbgfgRgIQTz8PoB9si004NiKrzw94zsG0uDznCK7EOV4Tz6XD3CdweN017UpYGp14HqqBJqDXglNTHw4kllMl1V8N+VpalANoEe04NYPLeRKVbiEO8Ealr4URklJtNOtL1gAsbUfUVzE0Q42se0TsJb0pId+faItqRkY79O8dnhe9MsPcwe6b7pvH0sVzCsSn20Rsenwc1fJ+H9PWSEFlPMLtObt1xF8dEUTTLH+lz94ps8a8XVBwygpsmEOr-MwJnrA90aJny4P+M0xELH1z-JpT5b7uS0xOGivBxOKk8ETXYdRguGDrLHxBeKZv437rjelDRJz5IVkGvt8f9uKfy-G0qO0T57-6XgH08GYpxRj3taYeDPbBpw-ra8TEydWYAdzK6rALcsfEEEjBV5TAp+OaTXm2WdIdQTQc3DLMDEkyzEY27oIskHQwCmcPWHpPelaEnik4ggzTXDDEBpBxBY8hnezn4h7J9lYo4-eqH8x2gageUJoWzPMFnIEwIuKcMLkbnAobkkeE3M7HwOTqP8hBAjVyKqQOCWdJCRuS7OBSfKoAUOjbI1gIPdTvg5IUiawFZzcD-ZaYpfIzuwLXJGk20UFFDkVQMFHkjBwgjCtlDVBuYMw0iOYBa3XwUlm4JFMiihyJYuDFBsQdwa5EtDiQ1wcYKeryV2icUbgTgwVvwNcFKDxKdSSIcSB8jtIdkMPb-mMiUo3BBagHQQX9DEhrBLaKcfrGLykQ110ox0Y6DQyepHtyuLFN6O12sTAlVImIQjgEz4ZWhWhjNHOv+w8peUfKIQibvGTER8pggI9bwHiBIYRV7Aw1XrHjVnphsbBByduitVSo6AMqWVXuNwMWhnAaeE8GSCbiMaVUZgM7dcAdw1CdMdhmSPYc9S7pdViAa7cWn9HiC4kvkZwCamsKppVU8MV5EYd7RepNp3qCjdGvfWQ4TdfIYvVMAsBupHA2kZ1KwHEOogbgeU2wtgbsLAbvCPqKDd0J8xOpv0YwFwGag4DJqglP6-cZth6ghHOVIGalMkRNxJK1l9KXQwHisNcgagsR1A2-EbmKwe9XhRI6NvIyYakD2h5tSIF0PsA9CJq3Xe-PMIOhSVpOAQu8qeDeHX9ThzHDpsSzBamsiQKwfrFn2sond3e2ooiiUD1E31XKedCYYXSCx8dcULfIRt5FtyQCIk3URSJhkzJWZcQX-E3p7SJHL01qnwogEezm5v12un9MRqDx4ZWB9KdmJfJmFDEe1SoDot7LfThE-VZGDfA0cuBTqV1+4eFWuoI2Bi1MZISwI4OgXFHhiZGvQZbGyLZpFi-e+uXUPWN366Mw+ZERSCJnOyJkt2LIosVKO1qKNmGZAibrtmNGWVTRpJUhnrDCBeBNBjmayrMWaBAhxoXwPgGQHsGK9uqXMKAMWM3p9xya1gOwOhmpGd9UUpiC2mcFtg6lUktouyjuL3EHijxbuE8WADPFYBPKCmeWMQF7J+0a4bacofiGvHeBbx4jfkWSDiD7B4ugJEIkDG3G7jqw+4w8a1V-ENEAJA+DAGQFgBgSFcJ6codOEohmxIkuIXNGyiEYdRTYc5b5OhlYFDdMkn4rCd+NwkYA-xAEoQONCBD1gsJVHG-igkyglp1xZwG2jDSOwJQMeImYGCbizGBD4InE7CT+N4n4TnYq9KJmwAsDlD-eN1Y4lMF+TAlLQshPvh434FxgMJX4nCSejwmnidJ0YvSSYEMn7FeW8XYVjEFiT7UDg-4OnmuFtgqSdR3IcxjQHCbWNbGeZexo43KEZhKhIQaoRlnIixIlgohQ3nyiGxMTgmoTcJpE2iarsJuMQqdDeKRHwS0mYvDZGuAK42x6p1ggkZknyaFNim-gUpuU2KmW8gOMEoRhEWQpNMk40danAuBsnbiiyRAPpgMyGYjNVYfHCMDd2FZvwMwbKdVPsFNzq9GCmUN8e7VUmngtmg-dyih1o4EgNkDHSKgwRcDi9eo59FOJV3fHo4-2zo15ip2glmxtSmnMcPHViDbRPSnyNzPHnFbigJ2CE5cO1Fa4agIgbqeYEDJhYwA4WCMCAGu1Wlmhgq2IU7IkmciwzqWxbLqWJNxr8sgKTbImFDjyjThYZkbaVnjJLHHsMKWJHaOED+JfSFCFM3GbK3lbUyLxaJYIA2xSwbJ3kyw9EazKjYxsjpc47ZHIT8H5dZ4j+K0HcMsCMFEwOTHpEWyjaHSAO4s8HJEJ5TEgYcDbDqJ+1cZg0Y+HbIAA */
    id: "root",
    type: "parallel",
    states: {
      DialogueManager: {
        initial: "Prepare",
        states: {
          Prepare: {
            on: { ASRTTS_READY: "Ready" },
            entry: [
              assign({
                spstRef: ({ spawn }) => {
                  return spawn(speechstate, {
                    input: {
                      settings: settings,
                    },
                  });
                },
              }),
            ],
          },
          Ready: {
            initial: "Greeting",
            states: {
              Greeting: {
                entry: "speak.greeting",
                on: { SPEAK_COMPLETE: "AskMeAnything" },
              },

              AskMeAnything: {
                entry: say("Ask me about an enemy, an item, or tell me if you need help in battle"),
                on: { SPEAK_COMPLETE: "AskGPT" },
              },
              // Our utterance, LastResult, is defined here first
              AskGPT: {
                entry: listen(),
                on: {
                  RECOGNISED: [
                    {
                      guard: ({ event }) => event.value[0].utterance.toLowerCase().replace(punctuation, "") == "yes" || event.value[0].utterance.toLowerCase().replace(punctuation, "") == "yeah",
                      target: "ImListening",

                    },
                    // {
                    //   guard: ({ event }) => checkList(event.value[0].utterance.toLowerCase().replace(punctuation, ""), thinking),
                    //   target: "TakeYourTime",
                    // },
                    {
                      target: "BeforeRecognizeEntities",
                      actions: [
                        ({ event }) => console.log(event.value[0].utterance),
                        assign({
                          lastResult: ({ event }) => event.value[0].utterance
                        }),
                      ]
                    },

                  ]
                },
              },
              BeforeRecognizeEntities: {
                entry: say(`${getRandomItemFromArray(fillerWords)}... Just give me one minute`),
                on: {SPEAK_COMPLETE: "RecognizeEntities"}
              },
              // First: we filter whatever items we can recognize directly. If they are not uttered within a complete sentence, we prioritize speed over conversation.
              RecognizeEntities: {
                always: [
                  // Attention: enemies here, info about their loot is prioritized, as the goal of the system is giving out item info
                  {
                    guard: ({ context }) => context.lastResult.toLowerCase() == chosenItem(context, enemy_list, "no"),
                    target: "GetLootInfo",
                    actions: assign({
                      item: ({ context }) => chosenItem(context, enemy_list, "yes"),
                      type: "enemy",
                    })
                  },
                  // Attention: equipment and items here
                  {
                    guard: ({ context }) => context.lastResult.toLowerCase() == chosenItem(context, weapon_list, "no"),
                    target: "GetWeapon",
                    actions: assign({
                      item: ({ context }) => chosenItem(context, weapon_list, "yes"),
                      type: "weapon"
                    })
                  },
                  {
                    guard: ({ context }) => context.lastResult.toLowerCase() == chosenItem(context, armor_list, "no"),
                    target: "GetArmor",
                    actions: assign({
                      item: ({ context }) => chosenItem(context, armor_list, "yes"),
                      type: "armor",
                    })
                  },
                  {
                    guard: ({ context }) => context.lastResult.toLowerCase() == chosenItem(context, ammo_list, "no"),
                    target: "GetAmmo",
                    actions: assign({
                      item: ({ context }) => chosenItem(context, ammo_list, "yes"),
                      type: "ammo",
                    })
                  },
                  {
                    guard: ({ context }) => context.lastResult.toLowerCase() == chosenItem(context, accessory_list, "no"),
                    target: "GetAccessory",
                    actions: assign({
                      item: ({ context }) => chosenItem(context, accessory_list, "yes"),
                      type: "accessory",
                    })
                  },
                  {
                    guard: ({ context }) => context.lastResult.toLowerCase() == chosenItem(context, item_list, "no"),
                    target: "GetItem",
                    actions: assign({
                      item: ({ context }) => chosenItem(context, item_list, "yes"),
                      type: "item",
                    })
                  },
                  // Attention: Loot here
                  {
                    guard: ({ context }) => context.lastResult.toLowerCase() == chosenItem(context, loot_list, "no"),
                    target: "GetLoot",
                    actions: assign({
                      item: ({ context }) => chosenItem(context, loot_list, "yes"),
                      type: "loot",
                    })
                  },
                  {
                    target: "GPT_intent",
                  },
                ]
              },
              // Just in case something fails with GPT
              DontUnderstand: {
                entry: say("Sorry, what was that again?"),
                on: { SPEAK_COMPLETE: "AskGPT" }
              },
              // Second: Intelligently recognize the intent  XX>location by giving the prompt features releated to each of those locations
              GPT_intent: {
                invoke: {
                  src: fromPromise(async ({ input }) => {
                    const data = await fetchFromChatGPT(guessIntent + input.lastResult, 400);
                    return data;
                  }),
                  input: ({ context }) => ({
                    lastResult: context.lastResult,
                  }),
                  onDone: [
                    // Check if there's actually an *enemy* in the *intent* *get loot info*
                    // What do we do about the case of: "White wolf"
                    {
                      guard: ({ event, context }) => JSON.parse(event.output).intent == "get loot info" && chosenItem(context, enemy_list, "no") != false,
                      target: "GetLootInfo",
                      actions: [({ event }) => console.log(event.output),
                      assign({
                        item: ({ context }) => chosenItem(context, enemy_list, "yes"),
                        type: "enemy",
                      })
                      ]
                    },
                    // Check if there's actually an *item* in the *intent* *get bazaar or item info*
                    {
                      guard: ({ event, context }) => JSON.parse(event.output).intent == "get bazaar or item info" && chosenItem(context, weapon_list, "no") != false,
                      target: "GetWeapon2",
                      actions: [({ event, context }) => console.log(event.output, context.lastResult.replace(punctuation, "")),
                      assign({
                        item: ({ context }) => chosenItem(context, weapon_list, "yes"),
                        type: "weapon",
                      })
                      ]
                    },
                    {
                      guard: ({ event, context }) => JSON.parse(event.output).intent == "get bazaar or item info" && chosenItem(context, armor_list, "no") != false,
                      target: "GetArmor2",
                      actions: [({ event, context }) => console.log(event.output, context.lastResult.replace(punctuation, "")),
                      assign({
                        item: ({ context }) => chosenItem(context, armor_list, "yes"),
                        type: "armor",
                      })
                      ]
                    },
                    {
                      guard: ({ event, context }) => JSON.parse(event.output).intent == "get bazaar or item info" && chosenItem(context, ammo_list, "no") != false,
                      target: "GetAmmo2",
                      actions: [({ event, context }) => console.log(event.output, context.lastResult.replace(punctuation, "")),
                      assign({
                        item: ({ context }) => chosenItem(context, ammo_list, "yes"),
                        type: "ammo",
                      })
                      ]
                    },
                    {
                      guard: ({ event, context }) => JSON.parse(event.output).intent == "get bazaar or item info" && chosenItem(context, accessory_list, "no") != false,
                      target: "GetAccessory2",
                      actions: [({ event, context }) => console.log(event.output, context.lastResult.replace(punctuation, "")),
                      assign({
                        item: ({ context }) => chosenItem(context, accessory_list, "yes"),
                        type: "accessory",
                      })
                      ]
                    },
                    {
                      guard: ({ event, context }) => JSON.parse(event.output).intent == "get bazaar or item info" && chosenItem(context, item_list, "no") != false,
                      target: "GetItem2",
                      actions: [({ event, context }) => console.log(event.output, context.lastResult.replace(punctuation, "")),
                      assign({
                        item: ({ context }) => chosenItem(context, item_list, "yes"),
                        type: "item",
                      })
                      ]
                    },
                    // REVISE loot (at the end)
                    {
                      guard: ({ event, context }) => JSON.parse(event.output).intent == "get bazaar or item info" && chosenItem(context, loot_list, "no") != false,
                      target: "GetLoot2",
                      actions: [({ event, context }) => console.log(event.output, context.lastResult.replace(punctuation, "")),
                      assign({
                        item: ({ context }) => chosenItem(context, loot_list, "yes"),
                        type: "loot",
                      })
                      ]
                    },
                    // Check for a *success strategy* intent with *enemy* on it
                    {
                      guard: ({ event, context }) => JSON.parse(event.output).intent == "check success strategy" && chosenItem(context, enemy_list, "no") != false,
                      target: "CheckSuccessStrategy",
                      actions: [({ event, context }) => console.log(event.output, context.lastResult.replace(punctuation, "")),
                      assign({
                        item: ({ context }) => chosenItem(context, enemy_list, "yes"),
                        type: "enemy",
                      })]
                    },
                    // * Special * Enemy Identification (disambiguated with Location information)
                    // Now, if there is no specific mention of an enemy or item, and the intent is to "get loot info" 
                    // (which GPT does surprisignly well for such a short and kinda ambiguous instruction), then go to "guessing of enemy"
                    // to do so, we need to know location for disambiguation
                    // but, to save resources, we detect if a location is given before hand, this will skip "GPT_location" and go directly to "GPT_enemy"
                    {
                      guard: ({ event, context }) => JSON.parse(event.output).intent == "get loot info" && chosenItem(context, location_list, "no") != false,
                      target: "GPT_enemy",
                      actions: assign({
                        location: ({ context }) => chosenItem(context, location_list, "yes"),
                        intent: "get loot info",
                      })
                    },
                    {
                      guard: ({ event, context }) => JSON.parse(event.output).intent == "check success strategy",
                      target: "GPT_location",
                      actions: [({ event, context }) => console.log(event.output, context.lastResult.replace(punctuation, "")),
                      assign({
                        type: "enemy",
                        intent: "check success strategy",
                      })]
                    },
                    {
                      guard: ({ event, context }) => JSON.parse(event.output).intent == "get loot info",
                      target: "GPT_location",
                      actions: assign({
                        intent: "get loot info"
                      }),
                    },
                    {
                      guard: ({ event }) => JSON.parse(event.output).intent == "thinking",
                      target: "TakeYourTime",
                    },
                    {
                      guard: ({ event }) => JSON.parse(event.output).intent == "off topic",
                      target: "FF12OnlyPlease",
                    },

                    {
                      target: "CouldntCatchThat",
                      actions: ({ event }) => console.log(event.output)
                    }
                  ]
                },
              },

              // This whole request is to *guess* the location before *guessing* the enemy, this step can be avoided if we allow location matching before this
              GPT_location: {
                initial: "GuessLocation",
                states: {

                  AskLocation :{
                    entry: say("Can you give me any details about the place where you find this enemy?"),
                    on : {SPEAK_COMPLETE : "ListenLocation"}
                  },

                  ListenLocation: {
                    entry: listen(),
                    on: { RECOGNISED: 
                    {
                      target: "BeforeGuessLocation",
                      actions: assign({
                        locationinfo: ({event}) => event.value[0].utterance ,
                      }),
                    },
                    },
                  },

                  BeforeGuessLocation: {
                    entry: say(`${getRandomItemFromArray(positiveFiller)}... Just one second`),
                    on: {SPEAK_COMPLETE: "GuessLocation"}
                  },

                  GuessLocation: {
                    invoke: {
                      src: fromPromise(async ({ input }) => {
                        const data = await fetchFromChatGPT(guessTheEnemy + input.lastResult + "about the location: " + input.locationinfo, 400);
                        return data;
                      }),
                      input: ({ context, event }) => ({
                        lastResult: context.lastResult,
                        locationinfo: context.locationinfo,
                      }),
                      onDone: [
                        {
                          guard: ({ event }) => JSON.parse(event.output).location == "unknown",
                          target: "AskLocation"
                        },
                        {
                          guard: ({ event }) => JSON.parse(event.output).location != "unknown",
                          target: "#root.DialogueManager.Ready.GPT_enemy",
                          actions: [({ event }) => console.log(event.output),
                          assign({
                            location: ({ context, event }) => JSON.parse(event.output).location,
                          })
                          ]
                        },
                        // ??
                        {
                          target: "AskLocation",
                        },
                      ]
                    },
                  },
                },
              },


              GPT_enemy: {
                initial: "GuessEnemy",
                states: {
                GuessEnemy: {
                   //entry: ({context}) => console.log(context.lootinfo, category.enemy, context.lastResult),
                invoke: {
                  src: fromPromise(async ({ input }) => {
                    const data = await fetchFromChatGPT(guessTheEnemy2 + "The current location is "+ input.location + "Location enemy list: \n" + location_enemy_dict[input.location]["enemies"] + "Sentence: \n" + input.lastResult, 400);
                    return data;
                  }),
                  input: ({ context, event }) => ({
                    location: context.location,
                    lastResult: context.lastResult,
                  }),
                  onDone: [
                    // Confirmation on location and enemy ahead
                    {
                      guard: ({ event }) => JSON.parse(event.output).enemy == "unknown",
                      target: "UnknownEnemy",
                      actions: ({event, context}) => console.log(JSON.parse(event.output).enemy)
                    },
                    {
                      guard: ({ event }) => JSON.parse(event.output).enemy != "unknown",
                      target: "ConfirmEnemy",
                      actions: [({event, context}) => console.log(JSON.parse(event.output).enemy),
                      assign({
                        item: ({ event }) => JSON.parse(event.output).enemy,
                      })
                      ]
                    },
                    // In case something goes wrong with GPT's answer:

                    //these go in Confirm Enemy and don't even apply here
                    // {
                    //   guard: ({ context }) => context.intent == "get loot info",
                    //   target: "#root.DialogueManager.Ready.GetLootInfo",
                    //   actions: [({ event, context }) => console.log(location_enemy_dict[context.location]["enemies"], guessTheEnemy2, event.output),
                    //   assign({
                    //     item: ({ context, event }) => JSON.parse(event.output).enemy,
                    //   })]
                    // },
                    // {
                    //   guard: ({ context }) => context.intent == "check success strategy",
                    //   target: "#root.DialogueManager.Ready.CheckSuccessStrategy",
                    //   actions: [({ event, context }) => console.log(context.location, context.lastResult),
                    //     assign({
                    //       item: ({ context, event }) => JSON.parse(event.output).enemy,
                    //     })
                    //   ]
                    // },
                    // {
                    //   guard: ({ event }) => JSON.parse(event.output).intent == "off topic",
                    //   target: "#root.DialogueManager.Ready.FF12OnlyPlease",
                    //   actions: ({ event }) => console.log(event.output)
                    // },
                    // {
                    //   guard: ({ event }) => JSON.parse(event.output).intent == "thinking",
                    //   target: "#root.DialogueManager.Ready.TakeYourTime",
                    //   actions: ({ event }) => console.log(event.output)
                    // },
                    // {
                    //   target: "#root.DialogueManager.Ready.CanYouBeMoreSpecific", 
                    // },
                  ],
                },
              },

              UnknownEnemy: {
                entry: ({ event, context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `I couldn't get the enemy you are referring to, is it located in the ${context.location}?`}
                  })},
                  on : {SPEAK_COMPLETE: "ConfirmLocation"}
                },

                StartOver: {
                  entry: say("Do you want to start over and make a different question?"),
                  on : {SPEAK_COMPLETE: "ConfirmStartOver"},
                },

                StillUnknownEnemy :{
                  entry: ({ event, context }) => {
                    context.spstRef.send({
                      type: "SPEAK",
                      value: { utterance: `Do you really think the enemy is located in the ${context.location}?`}
                    })},
                  on : {SPEAK_COMPLETE: "ConfirmLocation"}
                },

                ConfirmStartOver: {
                  entry: listen(),
                  on: {RECOGNISED: [
                    {
                      guard: ({ event}) => checkList(event.value[0].utterance.toLowerCase(), negation),
                      target: "StillUnknownEnemy",// if "no", ask again if the enemy is in the location
                      
                    },
                    { //check this
                      guard: ({ event}) => checkList(event.value[0].utterance.toLowerCase(), affirmation),
                      //target: "#root.DialogueManager.Ready.AskMeAnything", // no because context
                      target: "#root.DialogueManager.Ready.Bye", 
                      // does this work?
                      // actions: assign({
                      //   location: ({context, event}) => "",
                      //   item: ({context, event}) => "",
                      //   intent: ({context, event}) => "",
                      // })
                    },
                    
                    {
                      target: "DidntUnderstand"
                    }
                  ]}
                },

                OkayLetsStartOver:{ //check this
                  entry: say("Okay, let's just start over"),
                  on : {SPEAK_COMPLETE: "#root.DialogueManager.Ready.AskMeAnything"}
                },

                ConfirmLocation:{
                  entry: listen(),
                  on: { RECOGNISED: [
                    { // check this
                      guard: ({ event}) => event.value[0].utterance.toLowerCase().replace(punctuation, "").includes("let's go back"),
                      target: "#root.DialogueManager.Ready.AskMeAnything",
                    },
                    {
                      guard: ({ event}) => checkList(event.value[0].utterance.toLowerCase(), negation),
                      target: "FormulateLocationDifferently",
                    },
                    {
                      guard: ({ event}) => checkList(event.value[0].utterance.toLowerCase(), unsure), // ADD CANCEL OR START OVER
                      target: "StartOver",

                    },
                    {
                      guard: ({ event}) => checkList(event.value[0].utterance.toLowerCase(), affirmation),
                      target: "FormulateEnemyDifferently",
                    },
                    {
                      target: "DidntUnderstand"
                    }
                  ]}
              },
              //delete after debug
              Logit: {
                entry: ({event, context}) => console.log(event.value[0].utterance, context.lastResult),
                target: "",
              },

              FormulateLocationDifferently: {
                entry: say(`${getRandomItemFromArray(fillerWords)} Okay, try describing the place differently then`),
                on : {SPEAK_COMPLETE: "#root.DialogueManager.Ready.GPT_location.ListenLocation"},
              },

              FormulateEnemyDifferently:{
                entry: say("Okay, try describing the enemy a bit differently then"),
                on: { SPEAK_COMPLETE: "ListenEnemyAgain"}
              },

              ListenEnemyAgain: {
                entry: listen(),
                on: {RECOGNISED: 
                  {
                    //so, this should be alright, because in the context, "intent" has already be assigned, whatever it is, no?
                  target: "GuessEnemy",
                  actions: assign({
                    lastResult: ({ event }) => event.value[0].utterance,
                  })
                },
              }
              },

              ConfirmEnemy: {
                entry: ({ event, context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Is your enemy maybe ${context.item} ?`}
                  })},
                  on: { SPEAK_COMPLETE: "AcceptEnemy"}
              },

              AcceptEnemy:{
                entry: listen(),
                on: { RECOGNISED: [
                  {
                    guard: ({ event}) => checkList(event.value[0].utterance.toLowerCase(), negation),
                    target: "StartOver",
                  },
                  {
                    guard: ({ event, context }) => checkList(event.value[0].utterance.toLowerCase(), affirmation) && context.intent == "get loot info",
                    target: "#root.DialogueManager.Ready.GetLootInfo",
                  },
                  {
                    guard: ({ event, context }) => checkList(event.value[0].utterance.toLowerCase(), affirmation) && context.intent == "check success strategy",
                    target: "#root.DialogueManager.Ready.CheckSuccessStrategy",
                  },
                  {
                    guard: ({ event, context }) => checkList(event.value[0].utterance.toLowerCase(), probably) && context.intent == "get loot info",
                    target: "#root.DialogueManager.Ready.GetLootInfo",
                  },
                  {
                    guard: ({ event, context }) => checkList(event.value[0].utterance.toLowerCase(), probably) && context.intent == "check success strategy",
                    target: "#root.DialogueManager.Ready.CheckSuccessStrategy",
                  },
                  
                ]}
              },

              DidntUnderstand:{
                entry: say(`Sorry, what was that again?`),
                on: {SPEAK_COMPLETE: "hist"}

              },

              hist: {
                type: "history",
                history: "deep",
              }
          },
        },

              // Is this the same as...wait ProcessGPTenemy
              SpeakGPToutput: {
                entry: ({ event, context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `${getRandomItemFromArray(positiveFiller)}... ${enemy_encyclopedia[context.enemy]}` }, // enemy_encyclopedia[context.enemy] and send this to Process GPT
                  })
                },
                on: { SPEAK_COMPLETE: "AnythingElse" },
              },

              GetWeapon: {
                entry: say(`${getRandomItemFromArray(positiveFiller)}, ${getRandomItemFromArray(particular)}`),  //Anything in particular that you want to know about the weapon?`),
                on: {
                  SPEAK_COMPLETE:
                  {
                    // guard = if context.info != null
                    target: "ProcessGPT",
                    actions: [({ context }) => console.log(context.item, weapon_dict[context.item]["info"]),
                    assign({
                      info: ({ context }) => weapon_dict[context.item]["info"].replace("Stats :", "Stats "),
                    }),]
                  },

                }
              },
              // sorry, this is messy and repetitive but
              GetWeapon2: {
                entry: say(`${getRandomItemFromArray(fillerWords)}, ${getRandomItemFromArray(positiveFiller)} `),
                on: {
                  SPEAK_COMPLETE:
                  {
                    // guard = if context.info != null
                    target: "#root.DialogueManager.Ready.ProcessGPT.FilterInfoGPT",
                    actions: [({ context }) => console.log(context.item, weapon_dict[context.item]["info"]),
                    assign({
                      info: ({ context }) => weapon_dict[context.item]["info"].replace("Stats :", "Stats "),
                    }),]
                  },

                }
              },

              GetArmor: {
                entry: say(`${getRandomItemFromArray(fillerWords)}, ${getRandomItemFromArray(particular)} piece of armor? `),
                on: {
                  SPEAK_COMPLETE:
                  {
                    target: "ProcessGPT",
                    actions: [({ context }) => console.log(context.item, armor_dict[context.item]["info"]),
                    assign({
                      info: ({ context }) => armor_dict[context.item]["info"].replace("Stats :", "Stats "),
                    }),]
                  },
                }
              },

              GetArmor2: {
                entry: say(`${getRandomItemFromArray(fillerWords)}, ${getRandomItemFromArray(positiveFiller)} `),
                on: {
                  SPEAK_COMPLETE:
                  {
                    target: "ProcessGPT",
                    actions: [({ context }) => console.log(context.item, armor_dict[context.item]["info"]),
                    assign({
                      info: ({ context }) => armor_dict[context.item]["info"].replace("Stats :", "Stats "),
                    }),]
                  },
                }
              },


              GetAmmo: {
                entry: say(`${getRandomItemFromArray(fillerWords)}, ${getRandomItemFromArray(particular)} sort of ammunition? `),
                on: {
                  SPEAK_COMPLETE:
                  {
                    target: "ProcessGPT",
                    actions: [({ context }) => console.log(context.item, ammo_dict[context.item]["info"]),
                    assign({
                      info: ({ context }) => ammo_dict[context.item]["info"].replace("Stats :", "Stats "),
                    }),]
                  },
                }
              },

              GetAmmo2: {
                entry: say(`${getRandomItemFromArray(fillerWords)}, ${getRandomItemFromArray(positiveFiller)} `),
                on: {
                  SPEAK_COMPLETE:
                  {
                    target: "ProcessGPT",
                    actions: [({ context }) => console.log(context.item, ammo_dict[context.item]["info"]),
                    assign({
                      info: ({ context }) => ammo_dict[context.item]["info"].replace("Stats :", "Stats "),
                    }),]
                  },
                }
              },


              GetAccessory: {
                entry: say(`${getRandomItemFromArray(fillerWords)}, ${getRandomItemFromArray(particular)} accessory?`),
                on: {
                  SPEAK_COMPLETE:
                  {
                    target: "ProcessGPT",
                    actions: [({ context }) => console.log(context.item, accessory_dict[context.item]["info"]),
                    assign({
                      info: ({ context }) => accessory_dict[context.item]["info"].replace("Stats :", "Stats "),
                    }),]
                  },
                }
              },

              GetAccessory2: {
                entry: say(`${getRandomItemFromArray(fillerWords)}, ${getRandomItemFromArray(positiveFiller)} `),
                on: {
                  SPEAK_COMPLETE:
                  {
                    target: "ProcessGPT",
                    actions: [({ context }) => console.log(context.item, accessory_dict[context.item]["info"]),
                    assign({
                      info: ({ context }) => accessory_dict[context.item]["info"].replace("Stats :", "Stats "),
                    }),]
                  },
                }
              },


              GetItem: {
                entry: say(`${getRandomItemFromArray(fillerWords)}, ${getRandomItemFromArray(particular)} accessory? `),
                on: {
                  SPEAK_COMPLETE:
                  {
                    target: "ProcessGPT",
                    actions: [({ context }) => console.log(context.item, item_dict[context.item]["info"]),
                    assign({
                      info: ({ context }) => item_dict[context.item]["info"].replace("Stats :", "Stats "),
                    }),]
                  },
                }
              },

              GetItem2: {
                entry: say(`${getRandomItemFromArray(fillerWords)}, ${getRandomItemFromArray(positiveFiller)} `),
                on: {
                  SPEAK_COMPLETE:
                  {
                    target: "ProcessGPT",
                    actions: [({ context }) => console.log(context.item, item_dict[context.item]["info"]),
                    assign({
                      info: ({ context }) => item_dict[context.item]["info"].replace("Stats :", "Stats "),
                    }),]
                  },
                }
              },
              // Reformat Loot, connect to enemies
              GetLoot: {
                entry: say(`${getRandomItemFromArray(fillerWords)}, ${getRandomItemFromArray(particular)} type of loot?`),
                on: {
                  SPEAK_COMPLETE:
                  {
                    target: "ProcessGPT",
                    actions: [({ context }) => console.log(context.item, loot_dict[context.item]),
                    assign({
                      info: ({ context }) => JSON.stringify(loot_dict[context.item]), //.replace("{", "\n").replace("}", "\n").replace("\"", ""),
                    }),]
                  },
                }
              },

              GetLoot2: {
                entry: say(`${getRandomItemFromArray(fillerWords)}, ${getRandomItemFromArray(positiveFiller)} `),
                on: {
                  SPEAK_COMPLETE:
                  {
                    target: "ProcessGPT",
                    actions: [({ context }) => console.log(context.item, loot_dict[context.item]),
                    assign({
                      info: ({ context }) => JSON.stringify(loot_dict[context.item]), //.replace("{", "\n").replace("}", "\n").replace("\"", ""),
                    }),]
                  },
                }
              },
              // It's interesting how it's a bit hard for GPT to process stuff within nested dicts. Remove those brackets and you have better processing.
              GetLootInfo: {
                // By default, when enquiring about an enemy you will get loot info, this is prioritized for quickness, as is the goal of the system
                entry: say(`...${getRandomItemFromArray(positiveFiller)}... ${getRandomItemFromArray(fillerWords)}`),
                on: {
                  SPEAK_COMPLETE:
                  {
                    target: "#root.DialogueManager.Ready.ProcessGPTEnemy.FilterInfoGPTEnemy",
                    actions: [({ context }) => console.log(context.lastResult, context.item, JSON.stringify(enemy_encyclopedia[context.item]["info"])),
                    assign({
                      info: ({ context }) => JSON.stringify(enemy_encyclopedia[context.item]["info"]).replace("{", "\n").replace("}", "\n").replace("\"", ""),
                    }),]
                  },
                }
              },

              ProcessGPT: {
                initial: "AskFilterGPT",
                states: {
                  AnythingElseItem: {
                    entry: ({ event, context }) => {
                      context.spstRef.send({
                        type: "SPEAK",
                        value: { utterance: `So...anynthing else about this ${context.type}?` },
                      })
                    },
                    on: { SPEAK_COMPLETE: "AskGeneral" }
                  },
                  InitialQuestion: {
                    entry: ({ event, context }) => {
                      context.spstRef.send({
                        type: "SPEAK",
                        value: { utterance: `${getRandomItemFromArray(fillerWords)} ${getRandomItemFromArray(particular)} ${context.type}?` },
                      })
                    },
                    on: { SPEAK_COMPLETE: "AskFilterGPT" }
                  },
                  AskGeneral: {
                    entry: listen(),
                    on: {
                      RECOGNISED: [
                        {
                          guard: ({ event }) => checkList(event.value[0].utterance.toLowerCase(), negation),
                          target: "#root.DialogueManager.Ready.AnythingElse",
                        },
                        {
                          target: "BeforeAskFilterGPT",
                          actions: assign({
                            lastResult: ({ event }) => event.value[0].utterance,
                          })
                        },
                      ]
                    }
                  },

                  BeforeAskFilterGPT: {
                    entry: say(`${getRandomItemFromArray(positiveFiller)}... Just one second`),
                    on: {SPEAK_COMPLETE: "FilterInfoGPT"}
                  },

                  AskFilterGPT: {
                    entry: listen(),
                    on: {
                      RECOGNISED:
                        [
                          {
                            target: "FilterInfoGPT",
                            actions: assign({
                              lastResult: ({ event }) => event.value[0].utterance,
                            })
                          },
                        ]
                    }
                  },
                  FilterInfoGPT: {
                    invoke: {
                      src: fromPromise(async ({ input }) => {
                        const data = await fetchFromChatGPT(generateItemInfoAnswer + input.info + ". Sentence: " + input.lastResult, 400);
                        return data;
                      }),
                      input: ({ context }) => ({
                        lastResult: context.lastResult,
                        info: context.info,
                      }),
                      onDone: [
                        {
                          target: "SpeakFilterOutput",
                          actions: [({ event, context }) => console.log(event.output, context.lastResult, context.info),
                          assign({
                            output: ({ event }) => event.output,
                          })]

                        },
                      ]
                    },
                  },
                  SpeakFilterOutput: {
                    entry: ({ event, context }) => {
                      context.spstRef.send({
                        type: "SPEAK",
                        value: { utterance: `${event.output}` },
                      })
                    },
                    on: {
                      SPEAK_COMPLETE: [
                        // Can we rely on GPT for tasks like this? It can do this propperly a good percent of the time.
                        {
                          guard: ({ context }) => context.output == "Sorry, what information do you want to know about the item again?",
                          target: "AskFilterGPT",
                        },
                        {
                          target: "AnythingElseItem",
                        },
                      ]
                    },
                  },
                }
              },

              ProcessGPTEnemy: {
                initial: "AskFilterGPTEnemy",
                states: {
                  AnythingElseEnemy: {
                    entry: say("So, anything else about this enemy?"),
                    on: { SPEAK_COMPLETE: "AskGeneral" }
                  },
                  AskGeneral: {
                    entry: listen(),
                    on: {
                      RECOGNISED: [
                        {
                          guard: ({ event }) => checkList(event.value[0].utterance.toLowerCase(), negation),
                          target: "#root.DialogueManager.Ready.AnythingElse",
                        },
                        {
                          target: "FilterInfoGPTEnemy",
                          actions: assign({
                            lastResult: ({ event }) => event.value[0].utterance,
                          })
                        },
                      ]
                    }
                  },
                  AskFilterGPTEnemy: {
                    entry: listen(),
                    on: {
                      RECOGNISED:
                        [
                          {
                            target: "FilterInfoGPTEnemy",
                            actions: assign({
                              lastResult: ({ event }) => event.value[0].utterance,
                            })
                          },
                        ]
                    }
                  },
                  FilterInfoGPTEnemy: {
                    invoke: {
                      src: fromPromise(async ({ input }) => {
                        const data = await fetchFromChatGPT("This is the name of the enemy: " + input.enemy + "\n" + generateEnemyInfoAnswer + input.info + ". Sentence: " + input.lastResult, 400);
                        return data;
                      }),
                      input: ({ context }) => ({
                        lastResult: context.lastResult,
                        info: context.info,
                        enemy: context.item
                      }),
                      onDone: [
                        {
                          target: "SpeakFilterOutput",
                          actions: [({ event, context }) => console.log("This is the name of the enemy: " + context.item + "\n" + context.info, event.output, context.lastResult),
                          assign({
                            output: ({ event }) => event.output,
                          })]

                        },
                      ]
                    },
                  },
                  SpeakFilterOutput: {
                    entry: ({ event, context }) => {
                      context.spstRef.send({
                        type: "SPEAK",
                        value: { utterance: `${event.output}` },
                      })
                    },
                    on: {
                      SPEAK_COMPLETE: [
                        // Can we rely on GPT for tasks like this? It can do this propperly a good percent of the time.
                        {
                          guard: ({ context }) => context.output == "Sorry, what information do you want to know about the enemy again?",
                          target: "AskFilterGPTEnemy",
                        },
                        {
                          target: "AnythingElseEnemy",
                        },
                      ]
                    },
                  },
                }
              },

              CheckSuccessStrategy: {
                // The goal is for this to be a bit more conversational
                // Developing a "best strategy" would beg for a study of the game's battle system in more detail, a whole different domain
                initial: "AssignInfo",
                // Needed intents: question about enemy per se, but also: too strong, too fast, etc
                states: {
                  // First we recommend the most basic: elemental weakness, and then we see how that goes
                  AssignInfo: {
                    always: [
                      {
                        target: "StatusWeakness",
                        actions:
                          assign({
                          statuses : ({context}) => getVulnerableStatuses(enemy_encyclopedia[context.item]["info"]["Statuses and immunities"]),
                          weakness : ({context}) => getElementalWeakness(enemy_encyclopedia[context.item]["info"]["Elemental affinities"]),
                          status: ({context}) => 0,
                          weak: ({context}) => 0,
                          //magic : does it use a lot of magic attacks?
                          // it is very fast?
                          // what is it doing that is 
                        }), 
                      }
                    ]
                  },
                  // delete after debug
                  read: {
                    entry: ({context}) => console.log(context.lastResult)
                  },
                  
                  PriorToSpeakStatus: {
                    always: [
                      {
                        guard: ({context}) => context.statuses.length > 0,
                        target: "StatusWeakness"
                      },
                      {
                        target: "NoStatusWeakness",
                      }

                    ]
                  },
                  NoStatusWeakness:{
                    entry: say(`Oof, this is a though one, it has no status weaknesses...`), // This is a tough one
                    on : {SPEAK_COMPLETE: "ListenGPTsuccess"}
                  },
                  // Another way to have done the status selection woud have been to check length, randomize numbers depending on legth and go step by step indexing in every state to ensure variety, but length also changes so...
                  StatusWeakness : {
                    entry: ({ event, context }) => {
                      context.spstRef.send({
                        type: "SPEAK",
                        value: { utterance: `${getRandomItemFromArray(positiveFiller)} ${getRandomItemFromArray(firstOfAll)} ${getRandomItemFromArray(whyDontYouTry)} ${getRelevantStatus(context.statuses)}`}
                      })},
                    on: {SPEAK_COMPLETE: 
                      {
                        target: "ListenGPTsuccess",
                        actions: assign({
                          status: ({context}) =>context.status +1,
                        }),
                      },
                    }
                    },

                  ListenGPTsuccess: {
                    //change to last result
                    entry: listen(),
                    on: { RECOGNISED: 
                      {
                        target: "ProcessGPTsuccess",//"BeforeProcessGPTsuccess",
                        actions: [assign({
                          lastResult: ({event}) => event.value[0].utterance,
                        }), 
                        ({context}) => console.log(context.weak, context.status)
                      ]
                      }
                    },
                  },

                  // BeforeProcessGPTsuccess: {
                  //   always: [
                  //     {
                  //       guard: ({ event, context }) => checkList(context.lastResult, affirmation),
                  //       target: "OkayGreat",
                  //     },
                  //     {
                  //       target: "ProcessGPTsuccess"
                  //     }
                  //   ]
                  // },

                  ProcessGPTsuccess: {
                    invoke: {
                      src: fromPromise(async ({ input }) => {
                        const data = await fetchFromChatGPT(checkSuccessStrategyPrompt + input.lastResult , 400);
                        return data;
                      }),
                      input: ({ context }) => ({
                        lastResult: context.lastResult,
                      }),
                      onDone: [
                        {
                          guard: ({ event, context }) => JSON.parse(event.output).intent == "too fast" && checkList("Slow", context.statuses),
                          target: "TooFast",
                          actions: ({event}) => console.log(JSON.parse(event.output).intent),
                        },
                        {
                          guard: ({ event, context }) => JSON.parse(event.output).intent == "too fast" && checkList("Slow", context.statuses) == false,
                          target: "NoSlow",
                          actions: ({event}) => console.log(JSON.parse(event.output).intent),
                        },
                        {
                          guard: ({ event }) => JSON.parse(event.output).intent == "too strong",
                          target: "TooStrong",
                          actions: ({event}) => console.log(JSON.parse(event.output).intent),
                        },
                        {
                          guard: ({ event, context }) => JSON.parse(event.output).intent == "ask recommendation" && context.status == 1 ,
                          target: "PriorToNewStatusWeakness",
                          actions: ({event}) => console.log(JSON.parse(event.output).intent),
                        },
                        {
                          guard: ({ event, context }) => JSON.parse(event.output).intent == "ask recommendation" && context.status == 2 ,
                          target: "PriorToNewStatusWeakness2",
                          actions: ({event}) => console.log(JSON.parse(event.output).intent),
                        },
                        {
                          guard: ({ event, context }) => JSON.parse(event.output).intent == "affirmation",
                          target: "OkayGreat",
                          actions: ({event}) => console.log(JSON.parse(event.output).intent),
                        },
                        {
                          guard: ({ event, context }) => JSON.parse(event.output).intent == "wait" ,
                          target: "IWillWait",
                          actions: ({event}) => console.log(JSON.parse(event.output).intent),
                        },
                        {
                          guard: ({ event, context }) => JSON.parse(event.output).intent == "negation" && context.status == 1 ,
                          target: "PriorToNewStatusWeakness",
                          actions: ({event}) => console.log(JSON.parse(event.output).intent),
                        },
                        {
                          guard: ({ event, context }) => JSON.parse(event.output).intent == "negation" && context.weak == 1 ,
                          target: "PriorToNewElementalWeakness",
                          actions: ({event}) => console.log(JSON.parse(event.output).intent),
                        },
                        {
                          guard: ({ event, context }) => JSON.parse(event.output).intent == "negation" && context.status == 2 ,
                          target: "PriorToNewStatusWeakness2",
                          actions: ({event}) => console.log(JSON.parse(event.output).intent),
                        },
                        {
                          guard: ({ event, context }) => JSON.parse(event.output).intent == "ask recommendation" && context.weak == "full" ,
                          target: "PriorToTooStrong",
                          actions: ({event}) => console.log(JSON.parse(event.output).intent),
                        },
                        {
                          guard: ({ event, context }) => JSON.parse(event.output).intent == "ask recommendation" && context.status == "full" ,
                          target: "PriorToNewElementalWeakness",
                          actions: ({event}) => console.log(JSON.parse(event.output).intent),
                        },
                        {
                          guard: ({ event, context }) => JSON.parse(event.output).intent == "ask recommendation" && context.strong == "full" ,
                          target: "TooStrong",
                          actions: ({event}) => console.log(JSON.parse(event.output).intent),
                        },
                        {
                          guard: ({ event, context }) => JSON.parse(event.output).intent == "end" ,
                          target: "OkayGoodLuck",
                          actions: ({event}) => console.log(JSON.parse(event.output).intent),
                        },
                        {
                          target: "Nope",
                          actions: ({event}) => console.log(JSON.parse(event.output).intent),
                        }
                      ]
                    },

                  },
                  Nope:{
                    entry: say("Sorry, couldn't catch that, can you repeat it?"),
                    on : {SPEAK_COMPLETE: "ListenGPTsuccess"}
                  },
                  // Second step
                  PriorToElementalWeakness: {
                    always: [
                      {
                        guard: ({context}) => context.weakness.length > 0,
                        target: "ElementalWeakness"
                      },
                      {
                        target: "NoElementalWeakness",
                      }

                    ]
                  },

                  NoElementalWeakness:{
                    entry: say(`oof, this is gonna be a bit hard, it has no elemental weaknesses. Maybe try using the technique Aquilles?`), // This is a tough one
                    on : {SPEAK_COMPLETE: "ListenGPTsuccess"}
                  },

                  ElementalWeakness : {
                    entry: ({ event, context }) => {
                      context.spstRef.send({
                        type: "SPEAK",
                        value: { utterance: `${getRandomItemFromArray(positiveFiller)} Okay, now ${getRandomItemFromArray(whyDontYouTry)} ${getRandomItemFromArray(context.weakness)} weapons of magics?`}
                      })},
                    on: {SPEAK_COMPLETE: 
                      {
                        target: "ListenGPTsuccess",
                      },
                  },
                },

                PriorToNewStatusWeakness : {
                  always: [
                    {
                      guard: ({context}) => context.status.length > 1,
                      target: "ElementalWeakness",
                    },
                    {
                      target: "NoMoreStatusWeakness",
                    }
                  ]
                },

                NoMoreStatusWeakness : {
                  entry: say(`${getRandomItemFromArray(fillerWords)} Seems like it doesn't have any more...Status Vulnerabilities... `),
                  on: {SPEAK_COMPLETE: 
                    {
                      target: "ListenGPTsuccess" ,
                      actions: assign({
                        status: ({context}) => "full",
                      })
                    }
                }
                },

                NoMoreElementalWeakness : {
                  entry: say(`${getRandomItemFromArray(fillerWords)} Seems like it doesn't have any more...Elemental weaknesses... `),
                  on: {SPEAK_COMPLETE: 
                    {
                      target: "ListenGPTsuccess" ,
                      actions: assign({
                        weak: ({context}) => "full",
                      })
                    }
                }
                },

                PriorToNewElementalWeakness: {
                  always: [
                    {
                      guard: ({context}) => context.weakness == "full",
                      target: "NoMoreElementalWeakness"
                    },
                    {
                      guard: ({context}) => context.weakness.length > 1,
                      target: "ElementalWeakness"
                    },
                    {
                      target: "NoMoreElementalWeakness",
                    }

                  ]
                },

                NewElementalWeakness : {
                  entry: ({ event, context }) => {
                    context.spstRef.send({
                      type: "SPEAK",
                      value: { utterance: `${getRandomItemFromArray(positiveFiller)} Okay, this time ${getRandomItemFromArray(whyDontYouTry)} ${getRandomItemFromArray(context.weakness)} weapons of magics?`}
                    })},
                  on: {SPEAK_COMPLETE: 
                    {
                      target: "ListenGPTsuccess",
                      actions: assign({
                        weak: ({context}) =>context.status +1,
                      }),
                    },
                },
              },
                  // Third step or infinite, give new random status
                  NewStatusWeakness : {
                    entry: ({ event, context }) => {
                      context.spstRef.send({
                        type: "SPEAK",
                        value: { utterance: `${getRandomItemFromArray(positiveFiller)} Now ${getRandomItemFromArray(whyDontYouTry)} ${getRelevantStatus(context.statuses)}`}
                      })},
                    on: {SPEAK_COMPLETE: 
                      {
                        target: "ListenGPTsuccess",
                        actions: assign({
                          status: ({context}) =>context.status +1,
                        }),
                      },

                  },
                },

                PriorToNewStatusWeakness2 : {
                  always: [
                    {
                      guard: ({context}) => context.status == "full",
                      target: "NoMoreStatusWeakness"
                    },
                    {
                      guard: ({context}) => context.status.length > 2,
                      target: "ElementalWeakness"
                    },
                    {
                      target: "NoMoreStatusWeakness",
                    }
                  ]
                },

                NewStatusWeakness2 : {
                  entry: ({ event, context }) => {
                    context.spstRef.send({
                      type: "SPEAK",
                      value: { utterance: `${getRandomItemFromArray(positiveFiller)} Now ${getRandomItemFromArray(whyDontYouTry)} ${getRelevantStatus(context.statuses)}`}
                    })},
                  on: {SPEAK_COMPLETE: 
                    {
                      target: "ListenGPTsuccess",
                    },

                },
              },
                  TooFast:{
                    entry: say(`${getRandomItemFromArray(fillerWords)}..., ${getRandomItemFromArray(whyDontYouTry)} : ...Slow..., now?`),
                    on: {SPEAK_COMPLETE: "ListenGPTsuccess"} // do we want this???
                  },

                  NoSlow: {
                    entry: say(`${getRandomItemFromArray(fillerWords)} Looks like you can't use: "Slow", on this one `),
                    on: {SPEAK_COMPLETE: "ListenGPTsuccess"}
                  },

                  PriorToTooStrong: {
                    always : [
                      {
                        guard: ({context}) => context.strong == "full",
                        target: "AgainTooStrong"
                      },
                      {
                        target: "TooStrong"
                      }
                    ]
                  },

                  AgainTooStrong: {
                    entry: say(`${getRandomItemFromArray(fillerWords)}..., , as I've said before, try using ...Wither... as much as you can so that it looses strength `),
                    on: {SPEAK_COMPLETE: "ListenGPTsuccess"}
                  },

                  TooStrong:{//if you have wither and addle you can use that
                    entry: say(`${getRandomItemFromArray(fillerWords)}..., , if you have the technique...Wither..., you can lower its attack power. You can use it more than once by the way `),
                    on: {SPEAK_COMPLETE: 
                      {
                        target: "ListenGPTsuccess",
                        actions: assign({
                          strong: ({context}) => "full",
                        })
                      }} //do we want this???
                  },

                  // Q: does it use a lot of magic attacks?
                  // Magick: { //if you have wither and addle you can use , also try casting mute
                  //   entry: say(`${getRandomItemFromArray(fillerWords)} try using the technique: "Addle", to lower its magic power. Don't forget you can use it more than once. Also, try casting: "Mute"`),
                  //   on: {SPEAK_COMPLETE: "ListenGPTsuccess"} 
                  // },
                  // We leave room for some time to execute what we recommend, this gets a bit ruined because fetching from GPT takes some time
                  OkayGreat: {
                    // can't use parallel to speak and liste atst
                      entry: say(`${getRandomItemFromArray(letMeKnow)}, ${getRandomItemFromArray(checkOnYou)} a while, `),
                      on: {SPEAK_COMPLETE: "Wait"}
                  },
                  IWillWait: {
                    // can't use parallel to speak and liste atst
                      entry: say(`${getRandomItemFromArray(fillerWords)}, Okay, I'll just wait and ${getRandomItemFromArray(checkOnYou)} a bit,  `),
                      on: {SPEAK_COMPLETE: "Wait"}
                  },

                  IRanOutOfTips : {
                    entry: say(`Okay, I ran out of tips or advice, but ${getRandomItemFromArray(dontGiveUp)}. I'll check on you later!`),
                    on: {SPEAK_COMPLETE: "Wait"}
                  },


                  Wait: {
                    after: {
                      25000: {
                        target: "CheckOnPlayer"
                      },}
                  },
                  CheckOnPlayer:{
                    entry: say("How's it going?"),
                    on: {SPEAK_COMPLETE: "ListenGPTsuccess"}
                  },

                  OkayGoodLuck: {
                    entry: say(`${getRandomItemFromArray(goodBye)}, ${getRandomItemFromArray(dontGiveUp)}`),
                    on: {SPEAK_COMPLETE: "#root.DialogueManager.Ready.Bye"}
                  },
                },
              },

              // Other states

              CanYouBeMoreSpecific: {
                entry: say(`${getRandomItemFromArray(fillerWords)} Can you be a bit more specific about what you need?`),
                on: { SPEAK_COMPLETE: "AskGPT" },
              },

              TakeYourTime: {
                entry: say(" ... Take your time..."),
                on: { SPEAK_COMPLETE: "AskGPT" },
              },
              FF12OnlyPlease: {
                entry: say(`${(getRandomItemFromArray(fillerWords), getRandomItemFromArray(offTopic))}`),
                on: { SPEAK_COMPLETE: "AskGPT" },
              },
              CouldntCatchThat: {
                entry: say("Sorry, couldn't catch that, can you be a bit more specific or try with different words?"),
                on: { SPEAK_COMPLETE: "AskGPT" },
              },
              ImListening: {
                entry: say(`${getRandomItemFromArray(listening)}`),
                on: { SPEAK_COMPLETE: "AskGPT" },
              },

              AnythingElse: {
                entry: say(`${getRandomItemFromArray(positiveFiller)} Is there anything else you want to check?`),
                on: { SPEAK_COMPLETE: "ContinueOrNot" }
              },

              ContinueOrNot:{
                entry: listen(),
                on : {RECOGNISED: [
                  {
                    guard: ({event}) => checkList(event.value[0].utterance.toLowerCase(), affirmation) ,
                    target: "AskGPT"
                  },
                  {
                    guard: ({event}) => checkList(event.value[0].utterance.toLowerCase(), negation)  ,
                    target: "OkaySeeYa"
                  },
                  {
                    target: "AskGPT"
                  }
                ] }
              },

              OkaySeeYa: {
                entry: say(`${getRandomItemFromArray(goodBye)}`),
                on: {SPEAK_COMPLETE: "Bye"}
              },

              Bye: {
                type: "final"
              },

            },
          },
        },
      },
      GUI: {
        initial: "PageLoaded",
        states: {
          PageLoaded: {
            entry: "gui.PageLoaded",
            on: { CLICK: { target: "Inactive", actions: "prepare" } },
          },
          Inactive: { entry: "gui.Inactive", on: { ASRTTS_READY: "Active" } },
          Active: {
            initial: "Idle",
            states: {
              Idle: {
                entry: "gui.Idle",
                on: { TTS_STARTED: "Speaking", ASR_STARTED: "Listening" },
              },
              Speaking: {
                entry: "gui.Speaking",
                on: { SPEAK_COMPLETE: "Idle" },
              },
              Listening: { entry: "gui.Listening", on: { RECOGNISED: "Idle" } },
            },
          },
        },
      },
    },
  },
  {
    // custom actions
    //
    actions: {
      prepare: ({ context }) =>
        context.spstRef.send({
          type: "PREPARE",
        }),
      // saveLastResult:
      "speak.greeting": ({ context }) => {
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "Hi there!" },
        });
      },
      "gui.PageLoaded": ({ }) => {
        document.getElementById("button").innerText = "Click!";
      },
      "gui.Inactive": ({ }) => {
        document.getElementById("button").innerText = "Inactive";
      },
      "gui.Idle": ({ }) => {
        document.getElementById("button").innerText = "Idle";
      },
      "gui.Speaking": ({ }) => {
        document.getElementById("button").innerText = "Speaking...";
      },
      "gui.Listening": ({ }) => {
        document.getElementById("button").innerText = "Listening...";
      },
    },
  },
);

const actor = createActor(dmMachine).start();

document.getElementById("button").onclick = () => actor.send({ type: "CLICK" });
// HMMMM
actor.subscribe((state) => {
  console.log(state.value);
});

// actor.subscribe((event) => {
//   console.log(getSlots(event, "equipmentItemList", "weapon"));
// });


// actor.subscribe((event) => {
//   console.log(equipmentItemList.weapon[0]);
// });












// display tables --------------------------------------------------------
// TABLE EDITING WILL BE TRANSFERED TO A CSS FILE

// Create a background image URL
// const backgroundImageUrl = 'url(https://jegged.com/img/Games/Final-Fantasy-XII/Maps/World/World-Map.png)';

// // Set the background image style for the <body> element
// document.body.style.backgroundImage = backgroundImageUrl;
// document.body.style.backgroundRepeat = 'no-repeat';
// document.body.style.backgroundSize = 'cover'; // You can adjust this as needed

// Select the existing <img> element by its ID
const mapImage = document.getElementById('picture') as HTMLImageElement;
// Set the new image source (replace with the actual image path)
mapImage.src = 'https://jegged.com/img/Games/Final-Fantasy-XII/Maps/World/World-Map.png';
mapImage.classList.add('image-style1')

// Optionally, you can also update the alt text
// mapImage.alt = 'New Image Alt Text';

const messageHeaderDiv = document.getElementById("message-header");
messageHeaderDiv.textContent = "Welcome to Ivalice, kupo!"
messageHeaderDiv.classList.add('text-style2')

const messageDiv = document.getElementById("message");
//messageDiv.textContent = "Hello! Try asking something like:  \"What can I get from a skeleton?\" or \"What can I steal from wolves?\" or \"What can I poach from gargoyles in the jungle\". Bear in mind that the system won't recognize something like \"What can skeletons steal from ME?\". That's not possible, for now. Your request can be wordy, as long as you use the selected terms.";
messageDiv.textContent = "Ask me about any item, loot or tell me if you need help in the middle of a battle!"
messageDiv.classList.add('text-style1')




// Enemy Table
// Select the container element
// const tableContainer = document.getElementById('table1');

// // Create the table element
// const table = document.createElement('EnemyTable');

// // Create the table header (thead)
// const thead = document.createElement('thead');
// const headerRow = document.createElement('tr');

// // Add header columns
// const headers = ['Enemy Type', "", 'Location', ""]; 
// headers.forEach((headerText) => {
//   const th = document.createElement('th');
//   th.textContent = headerText;
//   headerRow.appendChild(th);
// });
// thead.appendChild(headerRow);

// Create the table body (tbody)
// const tbody = document.createElement('tbody');

// // Add rows with data
// const data = [
//   [" ", 'Desert', 'Jungle', 'Mines'],
//   ["wolf", correspondsTo["desert"]["wolf"], correspondsTo["jungle"]["wolf"], correspondsTo["mines"]["wolf"]],
//   ["skeleton", correspondsTo["desert"]["skeleton"], correspondsTo["jungle"]["skeleton"], correspondsTo["mines"]["skeleton"]],
//   ["gargoyle", correspondsTo["desert"]["gargoyle"], correspondsTo["jungle"]["gargoyle"], correspondsTo["mines"]["gargoyle"]]
//   // Add more rows as needed
// ];
// data.forEach((rowData) => {
//   const row = document.createElement('tr');
//   rowData.forEach((cellData) => {
//     const td = document.createElement('td');
//     td.textContent = cellData;

//     // Quick customization

//     // Check if it's a data row (customize this condition as needed)
//     if (rowData[0].startsWith(" ")) {
//       td.style.fontWeight = 'bold'; // Add this line to make text bold
//     }


//     row.appendChild(td);
//   });
//   tbody.appendChild(row);
// });

// // Append the thead and tbody to the table
// table.appendChild(thead);
// table.appendChild(tbody);

// // Append the table to the container
// tableContainer.appendChild(table);
// table.classList.add('table-style');
// ---------------------------------------------------------------

// table 2 --- - -- - - -- -- - - - -- - - 

// Select the container element
// const tableContainer2 = document.getElementById("table2");

// // Create the table element
// const table2 = document.createElement('ActionTable');

// // Create the table header (thead)
// const thead2 = document.createElement('thead');
// const headerRow2 = document.createElement('tr');

// // Add header columns
// const headers2 = ["", "Actions", ""]; // Replace with your actual headers
// headers2.forEach((headerText) => {
//   const th = document.createElement('th');
//   th.textContent = headerText;
//   headerRow2.appendChild(th);
// });
// thead2.appendChild(headerRow2);

// Create the table body (tbody)
// const tbody2 = document.createElement('tbody');

// // Add rows with data
// const data2 = [
//   ["Enemy", "DROP", ""],
//   ["You", "STEAL", "POACH"],
//   // Add more rows as needed
// ];
// data2.forEach((rowData) => {
//   const row = document.createElement('tr');
//   rowData.forEach((cellData) => {
//     const td = document.createElement('td');
//     td.textContent = cellData;
//     row.appendChild(td);
//   });
//   tbody2.appendChild(row);
// });

// // Append the thead and tbody to the table
// table2.appendChild(thead2);
// table2.appendChild(tbody2);

// // Append the table to the container
// tableContainer2.appendChild(table2);
// tableContainer2.classList.add('table-style');
// tableContainer2.classList.add('box2');





// ------------------------------------------------


