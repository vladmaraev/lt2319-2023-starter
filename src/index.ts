import { createMachine, createActor, assign, sendTo, raise, Actor, ActorRef } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "b7f17fcf06584fff85c25a0b297ddf00",
};

const settings1: Settings = {
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  locale: "en-US",
  asrDefaultNoInputTimeout: 10000,
  ttsDefaultVoice: "en-US-JennyNeural",
};

const settings2: Settings = {
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  locale: "es-ES",
  asrDefaultNoInputTimeout: 10000,
  ttsDefaultVoice: "es-ES-ArnauNeural",
};

const settings3: Settings = {
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  locale: "ja-JP",
  asrDefaultNoInputTimeout: 10000,
  ttsDefaultVoice: "ja-JP-NanamiNeural",
};

interface DMContext {
  spstRef?: any;
  lastResult?: Hypothesis[];
  // act?: any;
  // ene?: any;
  // loc?: any
}


interface Vocabulary {
  [index: string]: {
  [index: string]: Array<string> }
};

//👒🧢🥾 👗👙🧥 🩳👕👔
//🐶🐹🐰 🐱🦊🐻 🐮🐷🐸

// const langauges: Vocabulary = {
//   langauge: ["english", "spanish", "japanese"],
// };
const languages: Vocabulary= {
 emojis: {
  clothing: ["👒", "🧢", "🥾", "👗", "👙", "🧥", "🩳", "👕", "👔"],
  animals: ["🐶", "🐹", "🐰", "🐱", "🦊", "🐻", "🐮", "🐷", "🐸"]
},
 english: {
    clothing: ["hat", "cap", "boots", "dress", "bikini", "coat", "pants", "t-shirt", "shirt"],
    animals: ["dog", "hamster", "rabbit", "cat", "fox", "bear", "cow", "pig", "frog"]
},
 spanish: {
  clothing: ["sombrero", "gorra", "botas", "vestido", "bikini", "abrigo", "pantalones", "camiseta", "camisa"],
  animals: ["perro", "hamster","conejo", "gato","zorro","oso","vaca","cerdo", "rana"]
},
 japanese: {
  clothing: ["ぼうし", "キャップ", "ブーツ", "ワンピース", "ビキニ", "コート", "ズボン", "Tシャツ", "シャツ"],
  animals: ["いぬ", "ハムスター", "うさぎ", "ねこ", "きつね", "くま", "うし", "ぶた", "かえる"]
}
};


// Returns a category of the vocabulary, either "clothing" or "animals"
function pickRandom(language: string) {
  const random = Math.random();
  let selection;
if (random >= 0.5) {
  return selection = "clothing";
} else {
  return selection = "animals";
}
};

let categorySelection = pickRandom("english")

// game 
// a better way to do this ... function?
const divs = [
  document.getElementById("div1"),
  document.getElementById("div2"),
  document.getElementById("div3"),
  document.getElementById("div4"),
  document.getElementById("div5"),
  document.getElementById("div6"),
  document.getElementById("div7"),
  document.getElementById("div8"),
  document.getElementById("div9")
];


// Make landing-page grid
// categorySelection --> clothing or animals
function makeGrid() {
  for (let i = 0; i < divs.length && i < languages.emojis[categorySelection].length; i++) {
    const div = divs[i];
    const vocabItem = languages.emojis[categorySelection][i];

    if (div) {
      div.textContent = vocabItem;
    } 
  }
};

// calling the function
makeGrid()

// Designing the program: Order of questions needs to be randomized, otherwise the answer becomes obvious... 


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

// machine
const dmMachineEnglish = createMachine(
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
                      settings: settings1,
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
                on: { SPEAK_COMPLETE: "Instructions" },
              },

              Instructions: {
                entry: say("Choose the emoji that matches the word I will say! Ready? Go!"),
                on: { SPEAK_COMPLETE: "Word_1" },
              },

              Word_1: {
                initial: "ask",
                states: {
                  ask:{
                    entry: say(`${languages["english"][categorySelection][0]}`),
                    on: { SPEAK_COMPLETE: "waitforclick" }
                  },
                  oops: {
                    entry: say("Oops, listen again."),
                    on: { SPEAK_COMPLETE: "ask" }
                  },
                  waitforclick: {
                    on: {
                      CLICK_DIV_1: { target: "#root.DialogueManager.Ready.Word_2" },
                      CLICK_DIV_2: { target: "oops" },
                      CLICK_DIV_3: { target: "oops" },
                      CLICK_DIV_4: { target: "oops" },
                      CLICK_DIV_5: { target: "oops" },
                      CLICK_DIV_6: { target: "oops" },
                      CLICK_DIV_7: { target: "oops" },
                      CLICK_DIV_8: { target: "oops" },
                      CLICK_DIV_9: { target: "oops" },
                    }
                }
              },
            },

              Word_2: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["english"][categorySelection][1]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("Oops, listen again."),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "#root.DialogueManager.Ready.Word_3"},
                    CLICK_DIV_3: { target: "oops" },
                    CLICK_DIV_4: { target: "oops" },
                    CLICK_DIV_5: { target: "oops" },
                    CLICK_DIV_6: { target: "oops" },
                    CLICK_DIV_7: { target: "oops" },
                    CLICK_DIV_8: { target: "oops" },
                    CLICK_DIV_9: { target: "oops" },
                  }
                }
              }
              },

              Word_3: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["english"][categorySelection][2]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("Oops, listen again."),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "oops" },
                    CLICK_DIV_3: "#root.DialogueManager.Ready.Word_4",
                    CLICK_DIV_4: { target: "oops" },
                    CLICK_DIV_5: { target: "oops" },
                    CLICK_DIV_6: { target: "oops" },
                    CLICK_DIV_7: { target: "oops" },
                    CLICK_DIV_8: { target: "oops" },
                    CLICK_DIV_9: { target: "oops" }, 
                  }
                }
              }
              },
              Word_4: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["english"][categorySelection][3]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("Oops, listen again."),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "oops" },
                    CLICK_DIV_3: { target: "oops" },
                    CLICK_DIV_4: "#root.DialogueManager.Ready.Word_5",
                    CLICK_DIV_5: { target: "oops" },
                    CLICK_DIV_6: { target: "oops" },
                    CLICK_DIV_7: { target: "oops" },
                    CLICK_DIV_8: { target: "oops" },
                    CLICK_DIV_9: { target: "oops" }, 
                  }
                }
              }
              },
              Word_5: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["english"][categorySelection][4]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("Oops, listen again."),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "oops" },
                    CLICK_DIV_3: { target: "oops" },
                    CLICK_DIV_4: { target: "oops" },
                    CLICK_DIV_5: "#root.DialogueManager.Ready.Word_6" ,
                    CLICK_DIV_6: { target: "oops" },
                    CLICK_DIV_7: { target: "oops" },
                    CLICK_DIV_8: { target: "oops" },
                    CLICK_DIV_9: { target: "oops" }, 
                  }
                }
              }
              },
              Word_6: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["english"][categorySelection][5]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("Oops, listen again."),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "oops" },
                    CLICK_DIV_3: { target: "oops" },
                    CLICK_DIV_4: { target: "oops" },
                    CLICK_DIV_5: { target: "oops" },
                    CLICK_DIV_6: "#root.DialogueManager.Ready.Word_7",
                    CLICK_DIV_7: { target: "oops" },
                    CLICK_DIV_8: { target: "oops" },
                    CLICK_DIV_9: { target: "oops" },  
                  }
                }
              }
              },
              Word_7: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["english"][categorySelection][6]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("Oops, listen again."),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "oops" },
                    CLICK_DIV_3: { target: "oops" },
                    CLICK_DIV_4: { target: "oops" },
                    CLICK_DIV_5: { target: "oops" },
                    CLICK_DIV_6: { target: "oops" },
                    CLICK_DIV_7: "#root.DialogueManager.Ready.Word_8",
                    CLICK_DIV_8: { target: "oops" },
                    CLICK_DIV_9: { target: "oops" },  
                  }
                }
              }
              },
              Word_8: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["english"][categorySelection][7]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("Oops, listen again."),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "oops" },
                    CLICK_DIV_3: { target: "oops" },
                    CLICK_DIV_4: { target: "oops" },
                    CLICK_DIV_5: { target: "oops" },
                    CLICK_DIV_6: { target: "oops" },
                    CLICK_DIV_7: { target: "oops" },
                    CLICK_DIV_8: "#root.DialogueManager.Ready.Word_9",
                    CLICK_DIV_9: { target: "oops" },   
                  }
                }
              }
              },
              Word_9: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["english"][categorySelection][8]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("Oops, listen again."),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "oops" },
                    CLICK_DIV_3: { target: "oops" },
                    CLICK_DIV_4: { target: "oops" },
                    CLICK_DIV_5: { target: "oops" },
                    CLICK_DIV_6: { target: "oops" },
                    CLICK_DIV_7: { target: "oops" },
                    CLICK_DIV_8: { target: "oops" },
                    CLICK_DIV_9: "#root.DialogueManager.Ready.Congrats",   
                  }
                }
              }
              },   

              Congrats: {
                entry: say(" Congratulations! That's all the words! "),
                on: { SPEAK_COMPLETE: "#root" }
              }
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
        document.getElementById("bottom-text").innerText = "Choose a language to start!";
      },
      "gui.Inactive": ({}) => {
        document.getElementById("bottom-text").innerText = "Inactive";
      },
      "gui.Idle": ({}) => {
        document.getElementById("bottom-text").innerText = "Waiting...";
      },
      "gui.Speaking": ({}) => {
        document.getElementById("bottom-text").innerText = "Speaking...";
      },
      "gui.Listening": ({}) => {
        document.getElementById("bottom-text").innerText = "Listening...";
      },
    },
  },
);

const dmMachineSpanish = createMachine(
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
                      settings: settings2,
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
                entry: say("Bienvenidos."),
                on: { SPEAK_COMPLETE: "Instructions" },
              },

              Instructions: {
                entry: say("Escoged el emoji. Listos? Vamos"),
                on: { SPEAK_COMPLETE: "Word_1" },
              },

              Word_1: {
                initial: "ask",
                states: {
                  ask:{
                    entry: say(`${languages["spanish"][categorySelection][0]}`),
                    on: { SPEAK_COMPLETE: "waitforclick" }
                  },
                  oops: {
                    entry: say("Vaya, escucha otra vez."),
                    on: { SPEAK_COMPLETE: "ask" }
                  },
                  waitforclick: {
                    on: {
                      CLICK_DIV_1: { target: "#root.DialogueManager.Ready.Word_2" },
                      CLICK_DIV_2: { target: "oops" },
                      CLICK_DIV_3: { target: "oops" },
                      CLICK_DIV_4: { target: "oops" },
                      CLICK_DIV_5: { target: "oops" },
                      CLICK_DIV_6: { target: "oops" },
                      CLICK_DIV_7: { target: "oops" },
                      CLICK_DIV_8: { target: "oops" },
                      CLICK_DIV_9: { target: "oops" },
                    }
                }
              },
            },

              Word_2: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["spanish"][categorySelection][1]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("Vaya, escucha otra vez."),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "#root.DialogueManager.Ready.Word_3"},
                    CLICK_DIV_3: { target: "oops" },
                    CLICK_DIV_4: { target: "oops" },
                    CLICK_DIV_5: { target: "oops" },
                    CLICK_DIV_6: { target: "oops" },
                    CLICK_DIV_7: { target: "oops" },
                    CLICK_DIV_8: { target: "oops" },
                    CLICK_DIV_9: { target: "oops" },
                  }
                }
              }
              },

              Word_3: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["spanish"][categorySelection][2]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("Vaya, escucha otra vez."),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "oops" },
                    CLICK_DIV_3: "#root.DialogueManager.Ready.Word_4",
                    CLICK_DIV_4: { target: "oops" },
                    CLICK_DIV_5: { target: "oops" },
                    CLICK_DIV_6: { target: "oops" },
                    CLICK_DIV_7: { target: "oops" },
                    CLICK_DIV_8: { target: "oops" },
                    CLICK_DIV_9: { target: "oops" }, 
                  }
                }
              }
              },
              Word_4: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["spanish"][categorySelection][3]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("Vaya, escucha otra vez."),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "oops" },
                    CLICK_DIV_3: { target: "oops" },
                    CLICK_DIV_4: "#root.DialogueManager.Ready.Word_5",
                    CLICK_DIV_5: { target: "oops" },
                    CLICK_DIV_6: { target: "oops" },
                    CLICK_DIV_7: { target: "oops" },
                    CLICK_DIV_8: { target: "oops" },
                    CLICK_DIV_9: { target: "oops" }, 
                  }
                }
              }
              },
              Word_5: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["spanish"][categorySelection][4]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("Vaya, escucha otra vez."),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "oops" },
                    CLICK_DIV_3: { target: "oops" },
                    CLICK_DIV_4: { target: "oops" },
                    CLICK_DIV_5: "#root.DialogueManager.Ready.Word_6" ,
                    CLICK_DIV_6: { target: "oops" },
                    CLICK_DIV_7: { target: "oops" },
                    CLICK_DIV_8: { target: "oops" },
                    CLICK_DIV_9: { target: "oops" }, 
                  }
                }
              }
              },
              Word_6: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["spanish"][categorySelection][5]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("Vaya, escucha otra vez."),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "oops" },
                    CLICK_DIV_3: { target: "oops" },
                    CLICK_DIV_4: { target: "oops" },
                    CLICK_DIV_5: { target: "oops" },
                    CLICK_DIV_6: "#root.DialogueManager.Ready.Word_7",
                    CLICK_DIV_7: { target: "oops" },
                    CLICK_DIV_8: { target: "oops" },
                    CLICK_DIV_9: { target: "oops" },  
                  }
                }
              }
              },
              Word_7: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["spanish"][categorySelection][6]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("Vaya, escucha otra vez."),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "oops" },
                    CLICK_DIV_3: { target: "oops" },
                    CLICK_DIV_4: { target: "oops" },
                    CLICK_DIV_5: { target: "oops" },
                    CLICK_DIV_6: { target: "oops" },
                    CLICK_DIV_7: "#root.DialogueManager.Ready.Word_8",
                    CLICK_DIV_8: { target: "oops" },
                    CLICK_DIV_9: { target: "oops" },  
                  }
                }
              }
              },
              Word_8: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["spanish"][categorySelection][7]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("Vaya, escucha otra vez."),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "oops" },
                    CLICK_DIV_3: { target: "oops" },
                    CLICK_DIV_4: { target: "oops" },
                    CLICK_DIV_5: { target: "oops" },
                    CLICK_DIV_6: { target: "oops" },
                    CLICK_DIV_7: { target: "oops" },
                    CLICK_DIV_8: "#root.DialogueManager.Ready.Word_9",
                    CLICK_DIV_9: { target: "oops" },   
                  }
                }
              }
              },
              Word_9: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["spanish"][categorySelection][8]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("Vaya, escucha otra vez."),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "oops" },
                    CLICK_DIV_3: { target: "oops" },
                    CLICK_DIV_4: { target: "oops" },
                    CLICK_DIV_5: { target: "oops" },
                    CLICK_DIV_6: { target: "oops" },
                    CLICK_DIV_7: { target: "oops" },
                    CLICK_DIV_8: { target: "oops" },
                    CLICK_DIV_9: "#root.DialogueManager.Ready.Congrats",   
                  }
                }
              }
              },   

              Congrats: {
                entry: say(" Enhorabuena! Las has encertado todas! "),
                on: { SPEAK_COMPLETE: "#root" }
              }
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
        document.getElementById("bottom-text").innerText = "Choose a language to start!";
      },
      "gui.Inactive": ({}) => {
        document.getElementById("bottom-text").innerText = "Inactive";
      },
      "gui.Idle": ({}) => {
        document.getElementById("bottom-text").innerText = "Waiting...";
      },
      "gui.Speaking": ({}) => {
        document.getElementById("bottom-text").innerText = "Speaking...";
      },
      "gui.Listening": ({}) => {
        document.getElementById("bottom-text").innerText = "Listening...";
      },
    },
  },

);

const dmMachineJapanese = createMachine(
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
                      settings: settings3,
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
                entry: say("こんにちは！ボキャブラリ練習ゲムへよこそ！"),
                on: { SPEAK_COMPLETE: "Instructions" },
              },

              Instructions: {
                entry: say("絵文字をクリックしてみましょう！"),
                on: { SPEAK_COMPLETE: "Word_1" },
              },

              Word_1: {
                initial: "ask",
                states: {
                  ask:{
                    entry: say(`${languages["japanese"][categorySelection][0]}`),
                    on: { SPEAK_COMPLETE: "waitforclick" }
                  },
                  oops: {
                    entry: say("おっ、もう一回聞いてみましょう！"),
                    on: { SPEAK_COMPLETE: "ask" }
                  },
                  waitforclick: {
                    on: {
                      CLICK_DIV_1: { target: "#root.DialogueManager.Ready.Word_2" },
                      CLICK_DIV_2: { target: "oops" },
                      CLICK_DIV_3: { target: "oops" },
                      CLICK_DIV_4: { target: "oops" },
                      CLICK_DIV_5: { target: "oops" },
                      CLICK_DIV_6: { target: "oops" },
                      CLICK_DIV_7: { target: "oops" },
                      CLICK_DIV_8: { target: "oops" },
                      CLICK_DIV_9: { target: "oops" },
                    }
                }
              },
            },

              Word_2: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["japanese"][categorySelection][1]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("おっ、もう一回聞いてみましょう！"),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "#root.DialogueManager.Ready.Word_3"},
                    CLICK_DIV_3: { target: "oops" },
                    CLICK_DIV_4: { target: "oops" },
                    CLICK_DIV_5: { target: "oops" },
                    CLICK_DIV_6: { target: "oops" },
                    CLICK_DIV_7: { target: "oops" },
                    CLICK_DIV_8: { target: "oops" },
                    CLICK_DIV_9: { target: "oops" },
                  }
                }
              }
              },

              Word_3: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["japanese"][categorySelection][2]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("おっ、もう一回聞いてみましょう！"),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "oops" },
                    CLICK_DIV_3: "#root.DialogueManager.Ready.Word_4",
                    CLICK_DIV_4: { target: "oops" },
                    CLICK_DIV_5: { target: "oops" },
                    CLICK_DIV_6: { target: "oops" },
                    CLICK_DIV_7: { target: "oops" },
                    CLICK_DIV_8: { target: "oops" },
                    CLICK_DIV_9: { target: "oops" }, 
                  }
                }
              }
              },
              Word_4: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["japanese"][categorySelection][3]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("おっ、もう一回聞いてみましょう！"),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "oops" },
                    CLICK_DIV_3: { target: "oops" },
                    CLICK_DIV_4: "#root.DialogueManager.Ready.Word_5",
                    CLICK_DIV_5: { target: "oops" },
                    CLICK_DIV_6: { target: "oops" },
                    CLICK_DIV_7: { target: "oops" },
                    CLICK_DIV_8: { target: "oops" },
                    CLICK_DIV_9: { target: "oops" }, 
                  }
                }
              }
              },
              Word_5: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["japanese"][categorySelection][4]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("おっ、もう一回聞いてみましょう！"),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "oops" },
                    CLICK_DIV_3: { target: "oops" },
                    CLICK_DIV_4: { target: "oops" },
                    CLICK_DIV_5: "#root.DialogueManager.Ready.Word_6" ,
                    CLICK_DIV_6: { target: "oops" },
                    CLICK_DIV_7: { target: "oops" },
                    CLICK_DIV_8: { target: "oops" },
                    CLICK_DIV_9: { target: "oops" }, 
                  }
                }
              }
              },
              Word_6: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["japanese"][categorySelection][5]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("おっ、もう一回聞いてみましょう！"),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "oops" },
                    CLICK_DIV_3: { target: "oops" },
                    CLICK_DIV_4: { target: "oops" },
                    CLICK_DIV_5: { target: "oops" },
                    CLICK_DIV_6: "#root.DialogueManager.Ready.Word_7",
                    CLICK_DIV_7: { target: "oops" },
                    CLICK_DIV_8: { target: "oops" },
                    CLICK_DIV_9: { target: "oops" },  
                  }
                }
              }
              },
              Word_7: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["japanese"][categorySelection][6]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("おっ、もう一回聞いてみましょう！"),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "oops" },
                    CLICK_DIV_3: { target: "oops" },
                    CLICK_DIV_4: { target: "oops" },
                    CLICK_DIV_5: { target: "oops" },
                    CLICK_DIV_6: { target: "oops" },
                    CLICK_DIV_7: "#root.DialogueManager.Ready.Word_8",
                    CLICK_DIV_8: { target: "oops" },
                    CLICK_DIV_9: { target: "oops" },  
                  }
                }
              }
              },
              Word_8: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["japanese"][categorySelection][7]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("おっ、もう一回聞いてみましょう！"),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "oops" },
                    CLICK_DIV_3: { target: "oops" },
                    CLICK_DIV_4: { target: "oops" },
                    CLICK_DIV_5: { target: "oops" },
                    CLICK_DIV_6: { target: "oops" },
                    CLICK_DIV_7: { target: "oops" },
                    CLICK_DIV_8: "#root.DialogueManager.Ready.Word_9",
                    CLICK_DIV_9: { target: "oops" },   
                  }
                }
              }
              },
              Word_9: {
                initial: "ask",
              states: {
                ask:{
                  entry: say(`${languages["japanese"][categorySelection][8]}`),
                  on: { SPEAK_COMPLETE: "waitforclick" }
                },
                oops: {
                  entry: say("おっ、もう一回聞いてみましょう！"),
                  on: { SPEAK_COMPLETE: "ask" }
                },
                waitforclick: {
                  on: {
                    CLICK_DIV_1: { target: "oops" },
                    CLICK_DIV_2: { target: "oops" },
                    CLICK_DIV_3: { target: "oops" },
                    CLICK_DIV_4: { target: "oops" },
                    CLICK_DIV_5: { target: "oops" },
                    CLICK_DIV_6: { target: "oops" },
                    CLICK_DIV_7: { target: "oops" },
                    CLICK_DIV_8: { target: "oops" },
                    CLICK_DIV_9: "#root.DialogueManager.Ready.Congrats",   
                  }
                }
              }
              },   

              Congrats: {
                entry: say(" おめでとうございます！クリアーできました！"),
                on: { SPEAK_COMPLETE: "#root" }
              }
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
        document.getElementById("bottom-text").innerText = "Choose a language to start!";
      },
      "gui.Inactive": ({}) => {
        document.getElementById("bottom-text").innerText = "Inactive";
      },
      "gui.Idle": ({}) => {
        document.getElementById("bottom-text").innerText = "Waiting...";
      },
      "gui.Speaking": ({}) => {
        document.getElementById("bottom-text").innerText = "Speaking...";
      },
      "gui.Listening": ({}) => {
        document.getElementById("bottom-text").innerText = "Listening...";
      },
    },
  },

);


const actor1 = createActor(dmMachineEnglish).start();
const actor2 = createActor(dmMachineSpanish).start();
const actor3 = createActor(dmMachineJapanese).start();

// Click handlers
// This takes numbers from 1 to 9 (corresponding to grid) and gives back click "listeners" for every actor
// Because for every div element (in order) we need a specific event that determines it has been clicked on
// the name of the div (div1, div2, etc), corresponds with the name of the event (CLICK_DIV_1, etc.)
// function addClickHandlers(actor: Actor) {
//   for (let i = 1; i <= 9; i++) {
//     const div = document.getElementById(`div${i}`);
    
//     if (div) {
//       div.onclick = () => actor.send({ type: `CLICK_DIV_${i}` });
//     }
//   }
// };

// Couldn't make that work

// listeners for actor1
function addClickHandlers1() {
  for (let i = 1; i <= 9; i++) {
    const div = document.getElementById(`div${i}`);
    
    if (div) {
      div.onclick = () => actor1.send({ type: `CLICK_DIV_${i}` });
    }
  }
};
//addClickHandlers1();

// listeners for actor2
function addClickHandlers2() {
  for (let i = 1; i <= 9; i++) {
    const div = document.getElementById(`div${i}`);
    
    if (div) {
      div.onclick = () => actor2.send({ type: `CLICK_DIV_${i}` });
    }
  }
};
//addClickHandlers2();

// listeners for actor3
function addClickHandlers3() {
  for (let i = 1; i <= 9; i++) {
    const div = document.getElementById(`div${i}`);
    
    if (div) {
      div.onclick = () => actor3.send({ type: `CLICK_DIV_${i}` });
    }
  }
};
//addClickHandlers3();

// call actors and send click handlers 
document.getElementById("button-english").onclick = () => { actor1.send({ type: "CLICK" }), addClickHandlers1()};
document.getElementById("button-spanish").onclick = () => {actor2.send({ type: "CLICK" }); addClickHandlers2()};
document.getElementById("button-japanese").onclick = () => {actor3.send({ type: "CLICK" }); addClickHandlers3()};



// HMMMM
actor1.subscribe((state) => {
  console.log(state.value);
});







