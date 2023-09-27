import { createMachine, createActor, assign, sendTo, raise, fromPromise } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "b7f17fcf06584fff85c25a0b297ddf00",
};

const settings: Settings = {
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  locale: "en-US",
  asrDefaultNoInputTimeout: 10000,
  ttsDefaultVoice: "en-US-JennyNeural",
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
  [index: string] : Array<string>
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

// mydict = {"Genus": {"wolf": {"location" : {"Jungle": { "Hellhound": {"Drop": "a", "Steal": "b" , "Poach": "c"} }, "Desert":{"Wolf": {"Drop": "a", "Steal": "b" , "Poach": "c"} } }, "Mines": {"No Enemy"}}}}

async function fetchFromChatGPT(prompt: string, max_tokens: number) {
  const myHeaders = new Headers();
  myHeaders.append(
    "Authorization",
    "Bearer <key>",
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
    temperature: 0, //change to 0.2 to experiment
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




const category: Categories = {
  action: ["drop", "steal", "poach"],
  enemy: ["wolf", "wolves", "gargoyle", "gargoyles", "skeleton", "skeletons"], //use regex to fit plurals, etc
  location: ["desert", "jungle", "mines"],
  negation: ["nah", "no", "not really", "I don't think so", "nope"],
  affirmation: ["yes", "okay", "right", "sure", "yeah", "yep"],
};

// TO fix: use regex to fit plurals, etc.
const correspondsTo: Specific = {
    desert: {
      wolf: "Wolf", wolves: "Wolf", gargoyle: "NoEnemy", gargoyles: "NoEnemy", skeleton: "Fideliant", skeletons: "Fideliant", 
    }, jungle: {
      wolf: "Hellhound", wolves: "Hellhound", gargoyle: "Gargoyle", gargoyles: "Gargoyle", skeleton: "Dark Skeleton", skeletons: "Dark Skeleton", 
    }, mines: {
      wolf: "NoEnemy", wolves: "NoEnemy", gargoyle: "NoEnemy", gargoyles: "NoEnemy", skeleton: "Skeleton", skeletons: "Skeleton", 
    },
  };


const concreteloot: Specific = {
    "Fideliant" : {
    drop: "Common: Bone Fragment, Uncommon: Heavy Lance", 
    steal: "Common: Capricorn Gem", 
    poach: "Common: Pebble, Uncommon: Broken Spear"
    },
    "Dark Skeleton": {
      drop: "Common: Dark Magicite, Uncommon: Sturdy Bone, Rare: Teleport Stone", 
      steal: "Common: Sturdy Bone, Uncommon: Dark Magicite, Rare: Capricorn Gem", 
      poach: "Common: Sturdy Bone, Uncommon: Death's head"
    },
    "Skeleton": {
      drop: "Common: Bone Fragment, Uncommon: Dark Stone, Rare: Antidote",
      steal: "Common: Bone Fragment, Uncommon: 20 Gil, Rare: Dark Mote", 
      poach: "Common: Bone Fragment, Uncommon: Potion" 
    },

    "Wolf": {
      drop: "Common: Wolf Pelt, Uncommon: Wind Stone, Rare: Potion", 
      steal: "Common: Wind Stone, Uncommon: Wolf Pelt, Rare: Pointy Hat", 
      poach: "Common: Wolf Pelt, Uncommon: Eye Drops"
    },
    "Hellhound" : {
      drop: "Common: Tanned Hide, Uncommon: Fire Magicite, Rare: Dark Mote",
      steal: "Common: Prince's Kiss, Uncommon: Tanned Hide, Rare: Remedy",
      poach: "Common: Tanned Hide, Uncommon: Libra Gem",
  },
    "Gargoyle": {
      drop: "Common: Demon Eyeball, Uncommon: Storm Magicite, Rare: Gilt Measure, Very Rare: Potion", 
      steal: "Common:  Demon Eyeball, Uncommon: Storm Magicite, Rare: Warp Mote",
      poach: "Common: Demon Eyeball",
  },
    "NoEnemy": {
    drop: "There's no such enemy in that location.",
    steal: "There's no such enemy in that location.",
    poach: "There's no such enemy in that location."
  }
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

// function to extract slots
function getSlots(event, slot: string) {
  let utt = event.value[0].utterance.toLowerCase().replace(punctuation, "");
  let tokens = utt.split(" ")
  const filledSlot = tokens.filter(token => category[slot].includes(token));
  if (filledSlot.length > 0) {
    return filledSlot
  }
  else {
    return false
  }
};

function getLootInfo (context, action, enemy, location){
  let beastName = correspondsTo[location][enemy]
  return concreteloot[beastName][action]
};

function checkNoEnemyInfo (context, enemy, location){
  let beastName = correspondsTo[location][enemy]
  if (beastName === "NoEnemy"){
    return true
  }
  else {
    return false
  }

};



// machine
const dmMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QCcD2qAuA6AIgSwEMAbVKAVzAFkCA7AmZLABWTAAcDWBiAQQGUASgBUhfAPoCAojxwBNANoAGALqJQbVLDwY8qGmpAAPRACYAzIqwBOAKwWAHADZ7ARnv3FLkwBYANCABPRBcAdjNrK0ibTxsrEzsQqwBfJP80TFxCEnIqWnowRgEwAggArABxVjAdGiguPiZpAGkxAGEAeUomABlJIUklVSQQDS0dPQNjBDNvbyx7M1jQ+xsbbzMF-yDp9xCsWft4kJsQ8ysXbxS09Gx8YlIKajoGLCKSsp5YAGtKMB4aAIYAAWeFq9UaPBaHS6vX6gwMo20un0wymXhCW0Q3kUFiwLish0cIW8ji85yuIHStyyD1yzwKr2KpSwny+XCkHXKADkAJJ8SQ4eHDRHjFGgKYmDzWOyKJyudyeHyYhA2EyOCKRRyKEwhexWHEUqmZe45J75QpMj7fdmSTm8-mClxDdSaJETVGICyWWwOZxuDxePyBUzuOZWZz2MJEtWKKxmQ03Y3ZR55F5vZmsm12vkC+QmZ0jV2iyaekzemVy-2KoPbC4uSzeEzh7UbGahEIJjJ3ZN082M94s60c9rcnOCswFkXIkvTevS33ygNK4MIezY-YyxSk9Za5KpSmJ7u0s1py2DtnD0cO+TeSdF6ce2flhdVwPK8yuLBmY5NkJeRxWI28b7kaR6mqmDLplaF62iO9q5jYd5jA+4qls+sp+gqb4rmWjg2FgW7xC4LiOGY5iLJcIGHjS4H0haA6Zpe8GCo4SFumKRhofOGGLtWyouLE6r6lqbixIoaydtSJopnR-YZkOsFXrmIRscWj5etxlZYcu2y6iYWAmCRW7EicxzEZJSbHhB9HyWyhiwBgBAYGAWAEAAZs5yAABT1mWigAJRcKBNEyX2UHnkKLrIe6qEIJK6FaUuNalmqX6SmYAmRn+tiOBZYGhaeA6tKgZBEBANAYAAEsUyDgs0bSdD0fQDCoCL3jFnFxfqmmYUlyphC4WB-lqOpmBYZEuHlIW9oVtk8AAxqKWCtECYDzWykWFtFHESoJBlqmsZxxuY-EOPMsQ6m4RnRPYU3STNkFnqyC1LSta0bU6bXbTOhndc4xJ6mWiwrPx+KDfWcbau4gZ4XdPYno9DHfC9yLni9WZwWOm1Th1aKuPhJKRviISKCT3iqqDNj2PMJg6t4BKAZ44lw1Zsnhc9i2oxzGAY0pjqqShnVXQT-3E6TijkyYyqRNTGxqrYVjEhLLO0WFT3I5zeho4tXD2Y5zmuR5BQ+dqigBUF1H3QjNnQSjWvc9j7U7cE+P7KLivi5L-ES9T7ijaSnjeB2VFdtN1tybbms0FgPI0PNqAALZsHbNB1ZCDUws1jvfY+v2WP93iAziVM2MqWVYKROpV+T+qGSrBWI7Zkg0GACdlG961cNn7E-aS6q03hQGRGRZj8ZGvvA844kl7Y9cPTb57N637erZ38ifcKTs-YZ+eRoXcTFyDK6hKSBErJGMx2GqRJz+H7PfEvbeLy3vPMd3amxW4ixu0THtkxTx9iT6R1LESMNgSKGVWLfayEdn7Lzga-LGG8oo90fF-EWv8Sb-ylsfGwzgvyxAyrqVwpEwjQLZurL4j9oJL11g5JyLl3KeRNn5QKwUrYwPvlQluT9WRL3foLPG39CbZSwRLABtZSS+0IVuIkMxa7kLVkjbh8DY7xyTtQtOUJGqwhagLXGpgd4Vz3kXYGpdj6zD2LuKuAlPBjVyiHKS8NOGUO6KgeaTlUYdw2q1TeOdYpqiDtYX8+IDqrAlu+Rwhc8S2BJHEMsJE9zXFDhwihyi3EeNeqvD6+jnZxXMLvAGB8zHvhlPscmQcSShBOA45JTjWZKNshkzx9tvgZMQdeXxKCP5CxWBg0RnsJGmHAYNUiqx3BT1VDYRRs1oLNKWqydpTEkG5JnKJfpYtsHvjGnsP8ep8TiMAjfRxllVazPPPMrmbT3F0P1owo23lfJmzYZbZxaSmnuJadHRZ7iBEGIQOsn+Aytk4Q2NTQyepSYLBCIkcMMzG5zM+UtNRic2CXL0FojOTU4RdK2qggJBTjFFKBiXd8hkhIRjCBlWY6x4ULz4TwgI6LvkPxbksxSb9cU4zyS4DKVgCIkx8FfcmJ93zEkGj4D8ZhIg+lCHS2BDLl7Mrgey7M15kF4p6WiPlArtTkzIiKkIjhSmygImsJwxFabRFnic-K88FWsqVUiq5KjVWY2vPmL6+KhY6vFkKg14CjXvm8MRCungiRRJmOI4OdTTkN3pY6tuyrFVur5vICcXqtWIBWJYGY35tTgI8Hy0pkosB2AuGNbEFg1TAVjXau+lDqHJsde0vWDDDbMKeebdhbzGk0MZc211vyuVb0fASOYjZwyV0cH6HB2wfDfyhU2cdMwwiUTrWHFxyim3Oq1iijRA7d2pwaPVaE2K9GZsEdm6IX51iCsLTifEpTEgEWpWEGU5Monyq4SnQdL1U2ctWWgsi6ogEn31NPcMZL3AxLWHhPCThjjfsob+o92sMAAZWZe-5vLUpgaNRB1YUGcJgyGo2eKHtDKTVtZu95kdRR-sWphj1QHP4gbI4ZAjZsiPGpwrGfCkp9ThklKEIOtaDwpN7ec7myJGMYZucs68Ga-HeqmOfAiAlSLYkZmEKwZKvAGX9FfaIpxbo0dSX29Dsm0Pc1bfQg2TDjZdpeZJhp0mNYMZsx5jJfy8mRH0vWASgE1ySjWO+Yi1MjUnHxABYiSHzNSYRVZvQyr93JyjsyzFZ7dG+ZnOpmIWnYzYl02Sxw+k9l6h2fjMzG6LPua+Cnah6HaGKdzCO-xPq8ONnA9xwS-FFaDT9lPEi2JnDIeUY1xlzWX6tf5thnlGV9JxGE8RAC4k1T8VOOEKmu5YghvHjGiT9SzlJZk3oJr3MWscqxp6lTWaAWLeCStxJ63eO1ipuDWMNjoi8rMLUo7cb7U-qjhdjzV21W5mU90q9q5ZgGRxFCv78QZ16cAXDwiM7Di02lXg8bc0QdTcuy-NtDmHksOeRbVzJ2E0NYJ-AonYBctjt1AZSF0riK8rifxPC+dYxeGlXpeI66Af1q3fj0UTW0uTeXllnRWd2uqezXDoGiOyt4IAptwCZayskwWPTQ4Jw8dlDcZgWOblUDLWyTyNyXJUCaKZ7FL0+k714PpjCnEYRlRRPwpXA3qp3CKyN1gE3GAzcW+8db239uNXcpnE7-Y35XeKxJt+UeK4zLzEOOfWUgNFhB5D2HioeAABuYAC80HN7LzOOLWM+oxCuP7kYy3hL+3+NwKeg--EBCCWokgiCwBcnw-vYAOltdr1MRYxJrAXC3LXRYpNlQbAuAKjKTg4xalxwltzp2ATAlBFAPvA-F7D9H3Nu7MPAvqjNrqaVxcZXmO2K2IShdOM0vDLyzvu+e8H+H8fgfp+8xx9EA1g9gRMmwysmxwENhF9hoYlXBFYl8fAytP9u999D9B8H4T8Sd7lO1TZu1Xlt96Uv80Df8h8B8HdOoo05gB4Thvw1wtQ09H8AJ1QR4IUzYvBVQUC99e9SCAR0Cq9z0KCpgQDWcyQIDbBeV7BF9vdRD6ZI1yIZguDv90DloSoyoKpqpOBZASoBCcsFd7sRCwDhNIDJCYCZ0K4CRzBjgMIjVhcjRygABVHkZgfINxEoSALgVoboHkVoJoIQ0wRWeYIkEiRYKmHKHSLEWmSwWmZYApOgpJAHRw5w2OAgTmUvXgQQEQcQKQGQBQfQmHdKCuRIEaOJGdZwN7LEcJIooOcBGoskCyJIlkNIlyHkCAIgEfLIsQPgIQHgYQMfebOPAzNcb8ENQyHUcMVHbYaIcw44AMatMiQ4BopwponQUvGONokffgAQLonovowUfI-5R7YY8VMY4oyYrEd-AyD7AkKmGFckE5RolGNYvgNgYoL4ffXQ+XIA2cfSY40Y9ECY5UH7fuE4RWQTEuEwJY5wp4lyboPAByMAGgD42bfw6YOwfYOIapHwENWYEiZUemOcY4GFIOGFE4WYFIfcGgVACAOAAwKkAYx8AAWh1GVGZLsIIOpwZICRcC922zNm4z10OANXlRYHYE4DAC5M6lOH4hvRlQJC1E8BWESCN0lKmA1xXHWH5XpiiBpWKwJCD0qDAGqH31VOCBZIbycAnRfyJGJFOFJk72+F+C724KgFNIezNiGlcEgJbGcGSh2HXFjCFNCIyhIn+x7UIIdS+DdLi25znEWHOBn0q3iASPDOp1gWKlKnKiqhqjdJOHwlOEHniiiSVP6h8ArjIiwUJnrHE1TPjUjJTmjKpm200wWL9lmH6m6lwxhTphnU31q0SxpxTkt3ejdLLG6klWqQAiDl-FBlsCGmODjGIXODzy3zTOBwWQ82jNIkGnATwVbMOHbJXHHk9PlgSTXADAdNp2RTjlRQbPP3+R8G1AMjXVWCpnWznUQAJD2HWB1FlH-DGXZKpzrK4WoS3JxDLRbMlDbL9N5S1DxC+xnQynLWVlXOAsbSm28VHOImiO62OCnNOEVk2zwiGimTbEE3WBqxF1o0s0VV4UdS3PAQgr3KgoPJgoOBIriD9ipkE0vMlxvIPWXlHPI2fMvnGXfJlJOH2FjA2B53sSNUvOZS3PMCYt92gvCybB-kQyDmEwUrQ0wvvLyUMlxAnLwsAgIvr3nTsHwktV5VVGOivl0syRdQyS3L-BUv3OxP02pgiwD3I1AUAuOzQvSTQzS0UoMp+lmGARfLEtVA-LinYyNUhVWAsGOG-F4sPSco6lj0fDwV2QOkbA8GLJOG2SCROAPLVDCFJhrI5KCqbgyq+RVXcWjI4LxFCEymiGiyiRNWpkfVmEn11EbHSqdUyujjSx3RGrdNJHzPyqLMLmKpwgqSe3DHWG1LWACsBwbQmwyyPVzJhSGhmsKrmostMEfQMngzVzLGJLDJqqBxQ22pGvQxcvCrQVw09KEzNlcFmMYNMFIwqy03iDWBXP7IjPXOsweql3uq+UmviH2sLMOpLJIw2ArlCA2BDUVng0vOlzbl2ryrhq3COplNIngriFOFsV+2uqAtuq2ol0JzBxbmarcGsCizzWiCIm+oBS221x8EqrWFrmmVQqpvF2RD4vUXSxpsEuetijV1hsOnhvmskRJjdljDjEOBJgEnzxuDD1HNJI01dz9jaqkJXDsHCGnVZuT21ApsCsFuN01or3Dytxtzt0ZVHKFN1uLMOANq90YolkAlv1sEgMhIFs2uZHL3NyL1L1DtQDdIymItGkLmYLfLxPT1SkrlOFOBrnDQ1tNztqwCj2dslsoJIgEzXTXwQ3DS90MjxArNJirINCDrFw+GIJ4IH2jrLDLRWCnW-AAm-EXzsDmF1AuHph3ABn5uBrXKeibp-yPzIIlILrU1pjNRqJiOyk2Ab27rgMutWC1GQPrroxZEnpUK73QOjoWDSkOCK3rD-A2zXoXpE2mK1D-HpiUJIKPwzPUOzK0JKmjvwRnkQoIx7obzTs9IEhrTXGCyhKwvxNeoAgWFJipkjDrgeOWKYFcNQHcIgDdOlI1KiLgL+xqPOEQdjUaJSOaLdMjHxNVCsWJCnX83iGqoyEeNIbnsQHVO2ELhIjxBMiNVlEBtHsSOWJhPWPaOauOoQAJKW1JgmIHjLBWChJWJLxcheLeJNOYZVGX0nSwTCKpXOJVDNn5VEzwnGj+0UKQehOaOD3hOciRNqFzPUd-Dgb1G0fxP1BNuJFIjInGRXJSCAA */
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
                // CHECK ;)
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
                entry: say("Ask me about a type of enemy, an action to perform and a location to know the loot in FF12"),
                on: { SPEAK_COMPLETE: "Ask" },
              },

              GPT:{
                entry: ({context}) => console.log(context.lootinfo),
                invoke: {
                  src: fromPromise(async({ input })=> {
                    const data = await fetchFromChatGPT("Hey, GPT! Could you please reformulate the following sentence so it doesn't sound repetitive? FYI, the tags 'common', 'uncommon', etc., stand for the chances of getting the item. The sentence should sound natural and fluent. Don't omit any information. This is the sentence:" + input.lastResult, 200);
                    return data;
                  }),
                  input: ({ context, event}) => ({
                    lastResult: context.lootinfo,
                  }),
                  onDone: {
                    target: "SpeakGPToutput",
                    actions: [
                      ({ event }) => console.log(event.output) ,
                    ],
                  },
                },
              },

              // SpeakGPToutput: {
              //   entry: ({event}) => say(`${event.output}`),
              //   on: {SPEAK_COMPLETE: "AnythingElse" }
              // },

              SpeakGPToutput: {
                  entry: ({ event, context }) => {
                    context.spstRef.send({
                      type: "SPEAK",
                      value: { utterance: `${event.output}`},
                    })},
                    on: {SPEAK_COMPLETE: "AnythingElse" },
                  },

              Ask: {
                entry: listen(),
                // CONFIGURE TIMEOUT EVENT
                after: {
                  10200: {
                    target: "AskMeAnything",
                    actions: say("I couldn't hear you. Let's try again."), 
                  }
                },
                on: {
                  RECOGNISED: [
                    // if more than one SLOT of the same type, store them all! (in more advanced labs)
                    // complete
                    
                    {
                      guard: ({ event }) =>  getSlots(event, "action") && getSlots(event, "enemy") && getSlots(event, "location"),//extractAction(event) && extractEnemy(event) && extractLocation(event),
                      target: "LootInfo", //"SentenceParse"
                      actions: [
                        assign({lastResult: ({ event }) => event.value,}),
                        assign({ act: ({ event }) => getSlots(event, "action"),}),
                        assign({ ene: ({ event }) => getSlots(event, "enemy"),}),
                        assign({ loc: ({ event }) => getSlots(event, "location"),}),
                        ({context})=> console.log(context.act, context.ene, context.loc),
                      ]
                    },
                    // incomplete (2 in)
                    // ask location
                    {
                      guard: ({ event }) => getSlots(event, "action") && getSlots(event, "enemy"),
                      target: "AskLocation", //"SentenceParse"
                      actions:[
                        assign({lastResult: ({ event }) => event.value,}),
                        assign({ act: ({ event }) => getSlots(event, "action"),}),
                        assign({ ene: ({ event }) => getSlots(event, "enemy"),}),
                      ]
                    }, 

                    // ask enemy
                  {
                    guard: ({ context, event }) => getSlots(event, "action") && getSlots(event, "location"),
                    target: "AskEnemy", //"SentenceParse"
                    actions: [
                      assign({lastResult: ({ event }) => event.value,}),
                      assign({ act: ({ event }) => getSlots(event, "action"),}),
                      assign({ loc: ({ event }) => getSlots(event, "location"),}),
                    ]
                  },
                  // ask action
                  {
                    guard: ({ context, event }) => getSlots(event, "enemy") && getSlots(event, "location"),
                    target: "AskAction", //"SentenceParse"
                    actions:[
                      assign({lastResult: ({ event }) => event.value,}),
                      assign({ ene: ({ event }) => getSlots(event, "enemy"),}),
                      assign({ loc: ({ event }) => getSlots(event, "location"),}),
                  ]
                  },

                  // incomplete (1 in)
                  // ask enemy and location
                  {
                    guard: ({ event }) => getSlots(event, "action"),
                    target: "AskEnemyLocation", //"SentenceParse"
                    actions:[
                      assign({lastResult: ({ event }) => event.value,}),
                      assign({ act: ({ event }) => getSlots(event, "action"),}),
                  ]
                  },
                  // ask action and location
                  {
                    guard: ({ event }) => getSlots(event, "enemy"),
                    target: "AskActionLocation", //"SentenceParse"
                    actions:[
                      assign({lastResult: ({ event }) => event.value,}),
                      assign({ ene: ({ event }) => getSlots(event, "enemy"),}),
                  ]
                  },
                  // ask action and enemy
                  {
                    guard: ({ event }) => getSlots(event, "location"),
                    target: "AskActionEnemy", //"SentenceParse"
                    actions:[
                      assign({lastResult: ({ event }) => event.value,}),
                      assign({ loc: ({ event }) => getSlots(event, "location"),}),
                  ]
                  },

                  {
                    target: "CouldntHear",
                  }
                  ]
                },
              },

              CouldntHear: {
                entry: say("Something didn't work, hold on."),
                on: {SPEAK_COMPLETE: "Ask" },
              },

              // Asking for clarifications when 2 slots are filled 
              // ask for action >>> OK
              AskAction: {
                initial: "CheckIfNoEnemy",
                states: {
                  // If there's no enemy in a location, there's no point in asking for an action!
                  CheckIfNoEnemy: {
                    always: [
                      {
                        target: "#root.DialogueManager.Ready.LootInfo.NoEnemy",
                        guard: ({context}) => checkNoEnemyInfo (context, context.ene, context.loc),
                      },
                      {
                        target: "IncompAction"
                      }
                    ]
                  },
                  Check: {
                      always: [
                      {
                        target: "#root.DialogueManager.Ready.LootInfo",
                        guard: ({context}) => context.act.length > 0 && context.ene.length > 0 && context.loc.length > 0,
                      },
                      {
                        target: "IncompAction",
                      }],
                  },
                  AskAct: {
                    entry: listen(),
                    after: {
                      10200: {
                        target: "IncompAction",
                        actions: say("I couldn't hear you. Let's try again."), 
                      }
                    },
                    on: { 
                      RECOGNISED: [
                        {
                          guard: ({ event }) => getSlots(event, "action"),
                          target: "Check",
                          actions:[
                            assign({ act: ({ event }) => getSlots(event, "action"),}),
                            ({context})=> console.log(context.act),
                          ],
                        },
                        {
                          target: "IncompAction",
                        }
                      ] 
                    },
                  },
                  IncompAction: {
                    entry: say("What action is it"),
                    on: {SPEAK_COMPLETE: "AskAct" },
                  },
                },
              },
              
              // ask for enemy >> OK
              AskEnemy: {
                initial: "IncompEnemy",
                states: {
                  Check: {
                      always: [
                      {
                        target: "#root.DialogueManager.Ready.LootInfo",
                        guard: ({context}) => context.act.length > 0 && context.ene.length > 0 && context.loc.length > 0,
                      },
                      {
                        target: "IncompEnemy",
                      }],
                  },
                  AskEne: {
                    entry: listen(),
                    after: {
                      10200: {
                        target: "IncompEnemy",
                        actions: say("I couldn't hear you. Let's try again."), 
                      }
                    },
                    on: { 
                      RECOGNISED: [
                        {
                          guard: ({ event }) => getSlots(event, "enemy"),
                          target: "Check",
                          actions:[
                            assign({ ene: ({ event }) => getSlots(event, "enemy"),}),
                          ],
                        },
                        {
                          target: "IncompEnemy",
                        }
                      ] 
                    },
                  },
                  IncompEnemy: {
                    entry: say("What enemy is it?"),
                    on: {SPEAK_COMPLETE: "AskEne" },
                  },
                },
              },

              // ask location
              AskLocation: {
                initial: "IncompLocation",
                states: {
                  Check: {
                      always: [
                      {
                        target: "#root.DialogueManager.Ready.LootInfo",
                        guard: ({context}) => context.act.length > 0 && context.ene.length > 0 && context.loc.length > 0,
                      },
                      {
                        target: "IncompLocation",
                      }],
                  },
                  AskLoc: {
                    entry: listen(),
                    after: {
                      10200: {
                        target: "IncompLocation",
                        actions: say("I couldn't hear you. Let's try again."), 
                      }
                    },
                    on: { 
                      RECOGNISED: [
                        {
                          guard: ({ event }) => getSlots(event, "location"),
                          target: "Check",
                          actions:[
                            assign({ loc: ({ event }) => getSlots(event, "location"),}),
                          ],
                        },
                        {
                          target: "IncompLocation",
                        }
                      ] 
                    },
                  },
                  IncompLocation: {
                    entry: say("What is the location?"),
                    on: {SPEAK_COMPLETE: "AskLoc" },
                  },
                },
              },

              // Asking for clarifications when 1 slot is filled
              // Asking for enemy and location
              AskEnemyLocation : {
                initial: "IncompEnemyLocation",
                states: {
                  AskEneLoc: {
                    entry: listen(),
                    after: {
                      10200: {
                        target: "IncompEnemyLocation",
                        actions: say("I couldn't hear you. Let's try again."), 
                      }
                    },
                    on: { 
                      RECOGNISED: [
                        {
                          guard: ({ event }) => getSlots(event, "enemy") && getSlots(event, "location"),
                          target: "#root.DialogueManager.Ready.LootInfo",
                          actions:[
                            assign({ ene: ({ event }) => getSlots(event, "enemy"),}),
                            assign({ loc: ({ event }) => getSlots(event, "location"),}),
                          ],
                        },
                        {
                          guard: ({ event }) => getSlots(event, "enemy"),
                          target: "#root.DialogueManager.Ready.AskLocation",
                          actions:[
                            assign({ ene: ({ event }) => getSlots(event, "enemy"),}),
                          ],
                        },
                        {
                          guard: ({ event }) => getSlots(event, "location"),
                          target: "#root.DialogueManager.Ready.AskEnemy",
                          actions:[
                            assign({ loc: ({ event }) => getSlots(event, "location"),}),
                          ],
                        },
                        {
                          target: "IncompEnemyLocation",
                        }
                      ] 
                    },
                  },
                  IncompEnemyLocation: {
                    entry: say("What enemy and what's its location?"),
                    on: {SPEAK_COMPLETE: "AskEneLoc" },
                  },
                },
              },

              // Asking for action and location
              AskActionLocation: {
                initial: "IncompActionLocation",
                states: {
                  AskActLoc: {
                    entry: listen(),
                    after: {
                      10200: {
                        target: "IncompActionLocation",
                        actions: say("I couldn't hear you. Let's try again."), 
                      }
                    },
                    on: { 
                      RECOGNISED: [
                        {
                          guard: ({ event }) => getSlots(event, "action") && getSlots(event, "location"),
                          target: "#root.DialogueManager.Ready.LootInfo",
                          actions:[
                            assign({ act: ({ event }) => getSlots(event, "action"),}),
                            assign({ loc: ({ event }) => getSlots(event, "location"),}),
                          ],
                        },
                        {
                          guard: ({ event }) => getSlots(event, "action"),
                          target: "#root.DialogueManager.Ready.AskLocation",
                          actions:[
                            assign({ act: ({ event }) => getSlots(event, "action"),}),
                          ],
                        },
                        {
                          guard: ({ event }) => getSlots(event, "location"),
                          target: "#root.DialogueManager.Ready.AskAction",
                          actions:[
                            assign({ loc: ({ event }) => getSlots(event, "location"),}),
                          ],
                        },
                        {
                          target: "IncompActionLocation",
                        }
                      ] 
                    },
                  },
                  IncompActionLocation: {
                    entry: say("What action is it and what's the enemy location?"),
                    on: {SPEAK_COMPLETE: "AskActLoc" },
                  },
                },
              },

              // Asking for action and enemy
              AskActionEnemy : {
                initial: "IncompActionEnemy",
                states: {
                  AskActEne: {
                    entry: listen(),
                    after: {
                      10200: {
                        target: "IncompActionEnemy",
                        actions: say("I couldn't hear you. Let's try again."), 
                      }
                    },
                    on: { 
                      RECOGNISED: [
                        {
                          guard: ({ event }) => getSlots(event, "action") && getSlots(event, "enemy"),
                          target: "#root.DialogueManager.Ready.LootInfo",
                          actions:[
                            assign({ act: ({ event }) => getSlots(event, "action"),}),
                            assign({ ene: ({ event }) => getSlots(event, "enemy"),}),
                          ],
                        },
                        {
                          guard: ({ event }) => getSlots(event, "action"),
                          target: "#root.DialogueManager.Ready.AskEnemy",
                          actions:[
                            assign({ act: ({ event }) => getSlots(event, "action"),}),
                          ],
                        },
                        {
                          guard: ({ event }) => getSlots(event, "enemy"),
                          target: "#root.DialogueManager.Ready.AskAction",
                          actions:[
                            assign({ ene: ({ event }) => getSlots(event, "enemy"),}),
                          ],
                        },
                        {
                          target: "IncompActionEnemy",
                        }
                      ] 
                    },
                  },
                  // Give list of enemies
                  IncompActionEnemy: {
                    entry: say("What action do you want to use and to what enemy?"),
                    on: {SPEAK_COMPLETE: "AskActEne" },
                  },
                },
              },

              // Final Stage
              LootInfo: { 
                initial: "CheckIfNoEnemy",
                states: {
                  CheckIfNoEnemy: {
                    always: [
                      {
                        target: "NoEnemy",
                        guard: ({context}) => checkNoEnemyInfo (context, context.ene, context.loc),
                      },
                      {
                        target: "GiveLootInfo"
                      }
                    ]
                  },
                    
                //   GiveLootInfo: {
                //   entry: ({ context }) => {
                //     context.spstRef.send({
                //       type: "SPEAK",
                //       value: { utterance: `For the enemy ${correspondsTo[context.loc][context.ene]} the ${context.act} loot is: ${getLootInfo(context, context.act, context.ene, context.loc)}`},
                //     })},
                //   on: {
                //     SPEAK_COMPLETE: { 
                //       // target: "#root.DialogueManager.Ready.AnythingElse",
                //       target: "#root.DialogueManager.Ready.GPT",
                //       actions: assign({ lootinfo: ({context}) => `For the enemy ${correspondsTo[context.loc][context.ene]} the ${context.act} loot is: ${getLootInfo(context, context.act, context.ene, context.loc)}`}),
                //     },
                //   },
                // },

                GiveLootInfo: {
                  always: [
                    {
                      target: "#root.DialogueManager.Ready.GPT",
                      actions: assign({ lootinfo: ({context}) => `For the enemy ${correspondsTo[context.loc][context.ene]} the ${context.act} loot is: ${getLootInfo(context, context.act, context.ene, context.loc)}`}),
                    }
                  ]
                },

                NoEnemy:{
                  entry: say("There's no such enemy in that location."),
                  on: {SPEAK_COMPLETE: "#root.DialogueManager.Ready.AnythingElse" },
                }
                },
              },

              AnythingElse: {
                initial: "AnyElse",
                states: {
                  AskElse: {
                    entry: listen(),
                    after: {
                      10200: {
                        target: "#root.DialogueManager", 
                      }
                    },
                    // This part needs to be polished!
                    on: { 
                      RECOGNISED: [
                        {
                          guard: ({event})=> getSlots(event, "negation"),
                          target: "#root",
                          actions: say("All right, see ya.")
                        },
                        {
                          guard: ({event})=> getSlots(event, "affirmation"),
                          // target: "#root.DialogueManager.Ready.AskMeAnything",
                          target: "#root.DialogueManager.Ready.Ask",
                          actions: say("Okay, I'm listening.")
                        },
                        {
                          target: "CouldntHearYou",
                        }
                      ] 
                    },
                  },
                  AnyElse: {
                    entry: say("Is there anything else you'd like to ask?"),
                  on: {SPEAK_COMPLETE: "AskElse" },
                },
                CouldntHearYou: {
                  entry: say("Just say yes or no."),
                  on: {SPEAK_COMPLETE: "AskElse" }
                },
                },
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
      "gui.PageLoaded": ({}) => {
        document.getElementById("button").innerText = "Click to start!";
      },
      "gui.Inactive": ({}) => {
        document.getElementById("button").innerText = "Inactive";
      },
      "gui.Idle": ({}) => {
        document.getElementById("button").innerText = "Idle";
      },
      "gui.Speaking": ({}) => {
        document.getElementById("button").innerText = "Speaking...";
      },
      "gui.Listening": ({}) => {
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

const messageDiv = document.getElementById("message");
messageDiv.textContent = "Hello! Try asking something like:  \"What can I get from a skeleton?\" or \"What can I steal from wolves?\" or \"What can I poach from gargoyles in the jungle\". Bear in mind that the system won't recognize something like \"What can skeletons steal from ME?\". That's not possible, for now. Your request can be wordy, as long as you use the selected terms.";
messageDiv.classList.add('text-style1')

// Enemy Table
// Select the container element
const tableContainer = document.getElementById('table1');

// Create the table element
const table = document.createElement('EnemyTable');

// Create the table header (thead)
const thead = document.createElement('thead');
const headerRow = document.createElement('tr');

// Add header columns
const headers = ['Enemy Type', "", 'Location', ""]; 
headers.forEach((headerText) => {
  const th = document.createElement('th');
  th.textContent = headerText;
  headerRow.appendChild(th);
});
thead.appendChild(headerRow);

// Create the table body (tbody)
const tbody = document.createElement('tbody');

// Add rows with data
const data = [
  [" ", 'Desert', 'Jungle', 'Mines'],
  ["wolf", correspondsTo["desert"]["wolf"], correspondsTo["jungle"]["wolf"], correspondsTo["mines"]["wolf"]],
  ["skeleton", correspondsTo["desert"]["skeleton"], correspondsTo["jungle"]["skeleton"], correspondsTo["mines"]["skeleton"]],
  ["gargoyle", correspondsTo["desert"]["gargoyle"], correspondsTo["jungle"]["gargoyle"], correspondsTo["mines"]["gargoyle"]]
  // Add more rows as needed
];
data.forEach((rowData) => {
  const row = document.createElement('tr');
  rowData.forEach((cellData) => {
    const td = document.createElement('td');
    td.textContent = cellData;

    // Quick customization

    // Check if it's a data row (customize this condition as needed)
    if (rowData[0].startsWith(" ")) {
      td.style.fontWeight = 'bold'; // Add this line to make text bold
    }


    row.appendChild(td);
  });
  tbody.appendChild(row);
});

// Append the thead and tbody to the table
table.appendChild(thead);
table.appendChild(tbody);

// Append the table to the container
tableContainer.appendChild(table);
table.classList.add('table-style');
// ---------------------------------------------------------------

// table 2 --- - -- - - -- -- - - - -- - - 

// Select the container element
const tableContainer2 = document.getElementById("table2");

// Create the table element
const table2 = document.createElement('ActionTable');

// Create the table header (thead)
const thead2 = document.createElement('thead');
const headerRow2 = document.createElement('tr');

// Add header columns
const headers2 = ["", "Actions", ""]; // Replace with your actual headers
headers2.forEach((headerText) => {
  const th = document.createElement('th');
  th.textContent = headerText;
  headerRow2.appendChild(th);
});
thead2.appendChild(headerRow2);

// Create the table body (tbody)
const tbody2 = document.createElement('tbody');

// Add rows with data
const data2 = [
  ["Enemy", "DROP", ""],
  ["You", "STEAL", "POACH"],
  // Add more rows as needed
];
data2.forEach((rowData) => {
  const row = document.createElement('tr');
  rowData.forEach((cellData) => {
    const td = document.createElement('td');
    td.textContent = cellData;
    row.appendChild(td);
  });
  tbody2.appendChild(row);
});

// Append the thead and tbody to the table
table2.appendChild(thead2);
table2.appendChild(tbody2);

// Append the table to the container
tableContainer2.appendChild(table2);
tableContainer2.classList.add('table-style');
tableContainer2.classList.add('box2');





// ------------------------------------------------


