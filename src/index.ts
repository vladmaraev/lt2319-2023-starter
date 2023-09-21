import { createMachine, createActor, assign } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "ad818b0cdae94e4ea41aec30f7342a73",
};

const settings: Settings = {
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  locale: "en-US",
  asrDefaultNoInputTimeout: 5000,
  ttsDefaultVoice: "en-GB-RyanNeural",
};

interface DMContext {
  spstRef?: any;
  lastResult?: Hypothesis[];
  // name: any;
}

// creating a grammar for our utterances: 

//what = the meal you want to prepare
//when = the time you want the meal preperation to take or for when would you like the meal, e.g organize a meal for the whole week
//purpose = is there a special occasion or a specific detail? e.g. create a warm meal for rainy days. 

const grammar = {
  //meal prep utterances
  "find a recipe that's perfect for a date night tomorrow": {
    entities: {
    what: "recipe",
    when: "tomorrow",
    purpose: "date night",
    },
  },
  "i want a recipe that's perfect for date night": {
    entities: {
    what: "recipe",
    purpose: "date night",
    },
  },
  "create a recipe that's perfect for date night": {
    entities: {
    what: "recipe",
    purpose: "date night",
    },
  },
  "can you suggest an international dish for today?": {
    entities: {
    what: "dish",
    when: "today",
    purpose: "international",
    },
  },
  "create a smoothie for energy boost": {
    entities: {
    what: "smoothie",
    purpose: "energy boost",
    },
  },
  "create a gluten free and dairy free meal plan for the week": {
    entities: {
    what: "meal plan",
    when: "a week",
    purpose: "gluten-free and dairy-free",
    },
  },
  "create a quick sunday snack with bananas": {
    entities: {
    what: "quick snack",
    when: "Sunday",
    purpose: "with bananas",
    },
  },
  "suggest a recipe that's low in carbs and high in protein": {
    entities: {
      what: "recipe",
      purpose: "low in carbs and high in protein",
    }
  },
  "create a healthy afternoon snack": {
    entities: {
    what: "snack",
    when: "the afternoon",
    purpose: "healthy",
    },
  },
  "create an italian recipe for tonight": {
    entities: {
    what:"recipe",
    when: "tonight",
    purpose: "italian",
    }
  },
  "create a fun drink": {
    entities: {
    what: "drink",
    purpose: "fun",
    }
  },
  "plan a weekend picnic": {
    entities: {
      what: "picnic",
      when: "the weekend",
    },
  },
  "i want something for tomorrow's dinner": {
    entities: {
      when: "tomorrow",
      purpose: "dinner",
    },
  },
  "find me something savory for breakfast": {
    entities: {
      when: "breakfast",
      purpose: "savory",
    },
  },
  "create something sweet for dessert": {
    entities: {
      when: "dessert",
      purpose: "sweet",
    },
  },
  "find me something for today": {
    entities: {
      when: "today",
    },
  },
  "find me something quick": {
    entities: {
      purpose: "quick",
    },
  },
  "create a warm meal for rainy days": {
    entities: {
      what: "meal",
      when: "rainy days",
      purpose: "warm, comfort food",
    },
  },
  "suggest a meal for dinner tonight": {
    entities: {
      what: "meal", 
      when: "tonight" ,
    }
  },
  "find a recipe for a special occasion": {
    entities: {
      what: "recipe", 
      purpose: "special occasion",
    }
  },
  "create a healthy breakfast": {
    entities: {
      what: "breakfast", 
      purpose: "healthy",
    },
  },
  "can you recommend a quick and easy dish": {
    entities: {
      what: "dish", 
      purpose: "quick and easy",
    },
  },
  "suggest a dessert for this weekend": {
    entities: {
      what: "dessert", 
      when: "this weekend",
    },
  },
  "find a recipe with chicken for tomorrow's lunch": {
    entities: {
      what: "recipe with chicken", 
      when: "tomorrow", 
      purpose: "lunch" ,
    },
  },
  "create a vegetarian dinner": {
    entities: {
      what: "dinner", 
      purpose: "vegetarian",
    },
  },
  "suggest a cocktail recipe for a party": {
    entities: {
      what: "cocktail", 
      purpose: "party",
    },
  },
  "find something for a quick snack in the evening": {
    entities: {
      when: "the evening", 
      purpose: "quick snack",
    },
  },
  "create a soup for cold winter days": {
    entities: {
      what: "soup", 
      when: "cold winter days", 
      purpose: "comforting" 
    },
  },
  "find something for tomorrow": {
    entities: {
      when: "tomorrow"
    },
  },
  "find something for today": {
    entities: {
      when: "today"
    },
  },
  "find something for the morning": {
    entities: {
      when: "the morning"
    },
  },
  "i want something for the week": {
    entities: {
      when: "the week"
    },
  },
  "i want something for the weekend": {
    entities: {
      when: "the weekend"
    },
  },
  "i want something for sunday": {
    entities: {
      when: "Sunday"
    },
  },
  "find something sweet": {
    entities: {
      purpose: "sweet"
    },
  },
  "find something savory": {
    entities: {
      purpose: "savory"
    },
  },
  "find something lactose free": {
    entities: {
      purpose: "lactose free"
    },
  },
  "find something gluten free": {
    entities: {
    purpose: "gluten free"
    },
  },
  "i would like to have a donught": {
    entities: {
      what: "donught"
    },
  },
  "i would like to eat a donught": {
    entities: {
    what: "donught"
    },
  },
  "i want to have a donught": {
    entities: {
      what: "donught"
    },
  },
  "i want a donught": {
    entities: {
      what: "donught"
    },
  },
  "i would like to have a burger": {
    entities: {
      what: "burger"
    },
  },
  "i would like to eat a burger": {
    entities: {
      what: "burger"
    },
  },
  "i want to have a burger": {
    entities: {
      what: "burger"
    },
  },
  "i want burger": {
    entities: {
      what: "burger"
    },
  },
  "i would like to have pasta": {
    entities: {
      what: "pasta"
    },
  },
  "i would like to eat pasta": {
    entities: {
      what: "pasta"
    },
  },
  "i want to have pasta": {
    entities: {
      what: "pasta"
    },
  },
  "i want pasta": {
    entities: {
      what: "pasta"
    },
  },
  "i would like to have french fries": {
    entities: {
      what: "French fries"
    },
  },
  "i would like to eat french fries": {
    entities: {
      what: "French fries"
    },
  },
  "i want to have french fries": {
    entities: {
      what: "French fries"
    },
  },
  "i want french fries": {
    entities: {
      what: "French fries"
    },
  },
  "i would like to have a donught for tomorrow": {
    entities: {
      what: "donught",
      when: "tomorrow"
    },
  },
  "i would like to eat a donught for the afternoon": {
    entities: {
      what: "donught",
      when: "the afternoon"
    },
  },
  "i want to have a donught for Mondays": {
    entities: {
      what: "donught",
      when: "Mondays"
    },
  },
  "i want a donught for the weekend": {
    entities: {
      what: "donught",
      when: "the weekend"
    },
  },
  "i would like to have burger for the day": {
    entities: {
      what: "burger",
      when: "the day"
    },
  },
  "burger for tonight": {
    entities: {
      what: "burger",
      when: "tonight"
    },
  },
  "i want burger for friday": {
    entities: {
      what: "burger",
      when: "Friday"
    },
  },
  "i would like to have pasta for the morning": {
    entities: {
      what: "pasta",
      when: "the morning"
    },
  },
  "i would like to eat pasta for sunday": {
    entities: {
      what: "pasta",
      when: "Sunday"
    },
  },
  "i want to have pasta for tomorrow": {
    entities: {
      what: "pasta",
      when: "tomororow"
    },
  },
  "i want pasta for tonight": {
    entities: {
      what: "pasta",
      when: "tonight"
    },
  },
  "i would like to have french fries for the afternoon": {
    entities: {
      what: "Fench fries",
      when: "the afternoon"
    },
  },
  "i would like to eat french fries for tomorrow": {
    entities: {
      what: "Fench fries",
      when: "tomorrow"
    },
  },
  "i want to have french fries for friday": {
    entities: {
      what: "Fench fries",
      when: "Friday"
    },
  },
  "i want french fries for tonight": {
    entities: {
      what: "Fench fries",
      when: "tonight"
    },
  },
  "i want it to be vegeterian and for Tuesday": {
    entities: {
      purpose: "vegeterian",
      when:"Tuesday"
    }
  },
  "i would like something gluten free for tonight": {
    entities: {
      purpose: "gluten-free",
      when:"tonight"
    }
  },
  "i want something vegan for the week": {
    entities: {
      purpose: "vegan",
      when:"the week"
    }
  },
  "i want something sweet for the evening": {
    entities: {
      purpose: "sweet",
      when:"evening"
    }
  },
  "i would like something sweet for the evening": {
    entities: {
      purpose: "sweet",
      when:"evening"
    }
  },
  "i would like something lactose-free for the weekend": {
    entities: {
      purpose: "lactose-free",
      when:"the weekend"
    }
  },
  "i want something for the evening's date night": {
    entities: {
      purpose: "date night",
      when:"evening"
    }
  },
  "i want something for the tomorrow's meeting": {
    entities: {
      purpose: "meeting",
      when:"evening"
    }
  },
  "i want italian food for a date.": {
    entities: {
      purpose: "a date",
      what:"italian food"
    }
  },
  "italian food for a date.": {
    entities: {
      purpose: "a date",
      what:"italian food"
    }
  },
  "i want a vegan pizza": {
    entities: {
      purpose: "vegan",
      what:"pizza"
    }
  },
  "i want vegan pizza": {
    entities: {
      purpose: "vegan",
      what:"pizza"
    }
  },
  "vegan pizza": {
    entities: {
      purpose: "vegan",
      what:"pizza"
    }
  },
  "i want a savory meal": {
    entities: {
      purpose: "savory",
      what:"meal"
    }
  },
  "create a warm meal": {
    entities: {
      purpose: "warm",
      what:"meal"
    }
  },
}


//moved inside the guard = the new cond needs to be formed as a function that returns true/false


// const getEntity = (context: DMContext, entity: string) => {
//   // lowercase the utterance and remove tailing "."
//   let u = context.lastResult[0].utterance.toLowerCase().replace(/\.$/g, "");
//   if (u in grammar) {
//     if (entity in grammar[u].entities) {
//       return grammar[u].entities[entity];}
//   }
//   return false;
// };

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

// machine
const dmMachine = createMachine(
  {
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
                entry: "speak.greeting", //greeting state
                on: { SPEAK_COMPLETE: "GetName" }, //move to ask for name from here 
              },
              //new states for lab 1
              GetName: {
                entry: say("If you don't mind me asking, what shall I call you?"),
                on: { SPEAK_COMPLETE: "AskName" },
              },
              AskName: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: "Greet", //change state to say name. "so <name> what can i do for you today?"
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        name: ({event}) => event.value[0].utterance.replace(/\.$/g, ""),
                      }),
                    ],
                  },
                },
              },
              Greet: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Well ${context.name}, what can I do for you today?` },
                  });
                },
                on: { SPEAK_COMPLETE: "AskMeal" },
              },
              AskMeal: {
                entry: listen(),
                on: {
                  RECOGNISED:[
                    //all events are filled
                  {                  
                    target: "CompleteMeal",
                    guard: ({event}) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      if (u in grammar) {
                        if ("what" in grammar[u].entities && "when" in grammar[u].entities && "purpose" in grammar[u].entities) {
                          console.log(grammar[u].entities["what"])
                        return true
                      }
                      }
                      return false
                    }, 
                actions: [
                  ({ event }) => console.log(event),
                  assign({
                    what: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["what"]},
                    when: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["when"]},
                    purpose: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["purpose"]}
                  }),
                ],
                  },
                  // when event is missing -> the system will move to a state that is asking when will the meal/recipe is needed
                  {                  
                    target: "MissingWhen",
                    guard: ({event}) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      if (u in grammar) {
                        if ("what" in grammar[u].entities && "purpose" in grammar[u].entities) {
                          console.log(grammar[u].entities["what"])
                        return true
                      }
                      }
                      return false
                    }, 
                actions: [
                  ({ event }) => console.log(event),
                  assign({
                    what: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["what"]},
                    purpose: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["purpose"]}
                  }),
                ],
                  },
                  //what event is missing => system moves to a state that will ask what the user wants - e.g. if the user says something 
                  // instead a "recipe" or "meal" the system will ask if they want something specific
                  {                  
                    target: "MissingWhat",
                    guard: ({event}) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      if (u in grammar) {
                        if ("when" in grammar[u].entities && "purpose" in grammar[u].entities) {
                          console.log(grammar[u].entities["when"])
                        return true
                      }
                      }
                      return false
                    }, 
                actions: [
                  ({ event }) => console.log(event),
                  assign({
                    when: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["when"]},
                    purpose: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["purpose"]}
                  }),
                ],
                  },
                  //purpose event is missing - system moves to a different state that will ask if the user has a certain preference or if there is a special occasion.
                  {                  
                    target: "MissingPurpose",
                    guard: ({event}) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      if (u in grammar) {
                        if ("when" in grammar[u].entities && "what" in grammar[u].entities) {
                          console.log(grammar[u].entities["when"])
                        return true
                      }
                      }
                      return false
                    }, 
                actions: [
                  ({ event }) => console.log(event),
                  assign({
                    when: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["when"]},
                    what: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["what"]}
                  }),
                ],
                  },
                  //only having what - system moves to 2 different states that will ask for when and purpose (there is the chance of saying them together)
                  {                  
                    target: "onlyHaveWhat",
                    guard: ({event}) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      if (u in grammar) {
                        if ("what" in grammar[u].entities) {
                          console.log(grammar[u].entities["what"])
                        return true
                      }
                      }
                      return false
                    }, 
                actions: [
                  ({ event }) => console.log(event),
                  assign({
                    what: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["what"]},
                  }),
                ],
                  },
                  //only when is provided and the system will move to 2 different states to fill the rest (if both are mentioned in the first the form is completed)
                  {                  
                    target: "onlyHaveWhen",
                    guard: ({event}) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      if (u in grammar) {
                        if ("when" in grammar[u].entities) {
                          console.log(grammar[u].entities["when"])
                        return true
                      }
                      }
                      return false
                    }, 
                actions: [
                  ({ event }) => console.log(event),
                  assign({
                    when: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["when"]},
                  }),
                ],
                  },
                  //only purpose state is given and system moves to 2 different states (same description as above)
                  {                  
                    target: "onlyHavePurpose",
                    guard: ({event}) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      if (u in grammar) {
                        if ("purpose" in grammar[u].entities) {
                          console.log(grammar[u].entities["purpose"])
                        return true
                      }
                      }
                      return false
                    }, 
                actions: [
                  ({ event }) => console.log(event),
                  assign({
                    purpose: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["purpose"]},
                  }),
                ],
                  },
                  {
                    target: "noMatch",
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        lastResult: ({ event }) => event.value,
                      }),
                    ],
                  }
                  ],
                },
              },
              noMatch: {
                entry: say("Mmm, seems i can't find anything for that. Try something else!"),
                on: { SPEAK_COMPLETE: "AskMeal" },
              },
              CompleteMeal: {  //test state to be altered
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `perfect, i will create a ${context.what} for ${context.when} under the condition: ${context.purpose}!` },
                  });
                },
                on: { SPEAK_COMPLETE: "completed" },
              },
              //getting the missing when event when  user gives the what and the purpose
              MissingWhen: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `For when would you like your ${context.what}?` },
                  });
                },
                on: { SPEAK_COMPLETE: "GettingWhen" },
              },
              GettingWhen: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: "CompleteMeal", //change state to say name. "so <name> what can i do for you today?"
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        when: ({ event }) => {
                          const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "").replace("for ", "")
                          return u
                        },
                      }),
                    ],
                  },
                },
              },
              //getting the missing purpose event when user gives the what and the when
              MissingPurpose: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Is there any occasion taking place or a preference you would like your ${context.what} to have?` },
                  });
                },
                on: { SPEAK_COMPLETE: "GettingPurpose" },
              },
              GettingPurpose: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: "CompleteMeal", //change state to say name. "so <name> what can i do for you today?"
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        purpose: ({ event }) => {
                          const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "").replace("for ", "")
                          if (u === "no" || u === "no, thank you" || u === "no thank you") {
                            return "no preference"
                          }
                          return u
                        },
                      }),
                    ],
                  },
                },
              },
              // when user gives only when and purpose => state for filling out "what"
              MissingWhat: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Could you provide me with what would you like to eat, pizza, donughts, burger?` },
                  });
                },
                on: { SPEAK_COMPLETE: "GettingWhat" },
              },
              GettingWhat: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: "CompleteMeal", //change state to say name. "so <name> what can i do for you today?"
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        what: ({ event }) => {
                          const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "").replace("i would like to eat ", "").replace("i want to eat ", "").replace("i'm craving for ","").replace("i want a ").replace(" sounds nice","")
                          return u
                        },
                      }),
                    ],
                  },
                },
              },
              //missing BOTH what and purpose events
              onlyHaveWhen: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Could you provide me with what would you like to eat and if there is a specific preference or occasion? For example you can say: vegan pizza or italian food for a date.` },
                  });
                },
                on: { SPEAK_COMPLETE: "WhatAndPurpose" },
              },
              WhatAndPurpose: {
                entry: listen(),
                on: {
                  RECOGNISED:[
                    //all events are filled
                  {                  
                    target: "CompleteMeal",
                    guard: ({event}) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      if (u in grammar) {
                        if ("what" in grammar[u].entities && "purpose" in grammar[u].entities) {
                          console.log(grammar[u].entities["what"])
                        return true
                      }
                      }
                      return false
                    }, 
                actions: [
                  ({ event }) => console.log(event),
                  assign({
                    what: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["what"]},
                    purpose: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["purpose"]}
                  }),
                ],
                  },
                  //what event is missing => system moves to a state that will ask what the user wants - e.g. if the user says something 
                  // instead a "recipe" or "meal" the system will ask if they want something specific
                  {                  
                    target: "MissingWhat",
                    guard: ({event}) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      if (u in grammar) {
                        if ("purpose" in grammar[u].entities) {
                          console.log(grammar[u].entities["purpose"])
                        return true
                      }
                      }
                      return false
                    }, 
                actions: [
                  ({ event }) => console.log(event),
                  assign({
                    purpose: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["purpose"]}
                  }),
                ],
                  },
                  //purpose event is missing - system moves to a different state that will ask if the user has a certain preference or if there is a special occasion.
                  {                  
                    target: "MissingPurpose",
                    guard: ({event}) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      if (u in grammar) {
                        if ("what" in grammar[u].entities) {
                          console.log(grammar[u].entities["what"])
                        return true
                      }
                      }
                      return false
                    }, 
                actions: [
                  ({ event }) => console.log(event),
                  assign({
                    what: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["what"]}
                  }),
                ],
                  },
                  {
                    target: "nomatch",
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        lastResult: ({ event }) => event.value,
                      }),
                    ],
                  }
                  ],
                },
              },
              nomatch: {
                entry: say("Mmm, seems i can't find anything for that. Try something else!"),
                on: { SPEAK_COMPLETE: "WhatAndPurpose" },
              },
              //missing both when and porpuse
              onlyHaveWhat: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Could you provide me with when would you like to have your ${context.what} and if there is a specific preference or occasion? For example you can say: "I want it to be vegeterian and for Tuesday"` },
                  });
                },
                on: { SPEAK_COMPLETE: "WhenAndPurpose" },
              },
              WhenAndPurpose: {
                entry: listen(),
                on: {
                  RECOGNISED:[
                    //all events are filled
                  {                  
                    target: "CompleteMeal",
                    guard: ({event}) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      if (u in grammar) {
                        if ("when" in grammar[u].entities && "purpose" in grammar[u].entities) {
                          console.log(grammar[u].entities["when"])
                        return true
                      }
                      }
                      return false
                    }, 
                actions: [
                  ({ event }) => console.log(event),
                  assign({
                    when: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["when"]},
                    purpose: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["purpose"]}
                  }),
                ],
                  },
                  //what event is missing => system moves to a state that will ask what the user wants - e.g. if the user says something 
                  // instead a "recipe" or "meal" the system will ask if they want something specific
                  {                  
                    target: "MissingWhen",
                    guard: ({event}) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      if (u in grammar) {
                        if ("purpose" in grammar[u].entities) {
                          console.log(grammar[u].entities["purpose"])
                        return true
                      }
                      }
                      return false
                    }, 
                actions: [
                  ({ event }) => console.log(event),
                  assign({
                    purpose: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["purpose"]}
                  }),
                ],
                  },
                  //purpose event is missing - system moves to a different state that will ask if the user has a certain preference or if there is a special occasion.
                  {                  
                    target: "MissingPurpose",
                    guard: ({event}) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      if (u in grammar) {
                        if ("when" in grammar[u].entities) {
                          console.log(grammar[u].entities["when"])
                        return true
                      }
                      }
                      return false
                    }, 
                actions: [
                  ({ event }) => console.log(event),
                  assign({
                    when: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["when"]}
                  }),
                ],
                  },
                  {
                    target: "nomatch1",
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        lastResult: ({ event }) => event.value,
                      }),
                    ],
                  }
                  ],
                },
              },
              nomatch1: {
                entry: say("Mmm, seems i can't find anything for that. Try something else!"),
                on: { SPEAK_COMPLETE: "WhenAndPurpose" },
              },
              //missing BOTH what and when events
              onlyHavePurpose: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Could you provide me with what would you like to eat and when? For example you can say: I want pizza for tonight.` },
                  });
                },
                on: { SPEAK_COMPLETE: "WhenAndWhat" },
              },
              WhenAndWhat: {
                entry: listen(),
                on: {
                  RECOGNISED:[
                    //all events are filled
                  {                  
                    target: "CompleteMeal",
                    guard: ({event}) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      if (u in grammar) {
                        if ("when" in grammar[u].entities && "what" in grammar[u].entities) {
                          console.log(grammar[u].entities["when"])
                        return true
                      }
                      }
                      return false
                    }, 
                actions: [
                  ({ event }) => console.log(event),
                  assign({
                    when: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["when"]},
                    what: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["what"]}
                  }),
                ],
                  },
                  //what event is missing => system moves to a state that will ask what the user wants - e.g. if the user says something 
                  // instead a "recipe" or "meal" the system will ask if they want something specific
                  {                  
                    target: "MissingWhen",
                    guard: ({event}) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      if (u in grammar) {
                        if ("what" in grammar[u].entities) {
                          console.log(grammar[u].entities["what"])
                        return true
                      }
                      }
                      return false
                    }, 
                actions: [
                  ({ event }) => console.log(event),
                  assign({
                    what: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["what"]}
                  }),
                ],
                  },
                  //purpose event is missing - system moves to a different state that will ask if the user has a certain preference or if there is a special occasion.
                  {                  
                    target: "MissingWhat",
                    guard: ({event}) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      if (u in grammar) {
                        if ("when" in grammar[u].entities) {
                          console.log(grammar[u].entities["when"])
                        return true
                      }
                      }
                      return false
                    }, 
                actions: [
                  ({ event }) => console.log(event),
                  assign({
                    when: ({ event }) => {
                      const u = event.value[0].utterance.toLowerCase().replace(/\.$/g, "")
                      return grammar[u].entities["when"]}
                  }),
                ],
                  },
                  {
                    target: "nomatch2",
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        lastResult: ({ event }) => event.value,
                      }),
                    ],
                  }
                  ],
                },
              },
              nomatch2: {
                entry: say("Mmm, seems i can't find anything for that. Try something else!"),
                on: { SPEAK_COMPLETE: "WhenAndWhat" },
              },
              completed: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Here is a list of everything I found under ${context.what}. Enjoy!` },
                  });
                },
                on: { SPEAK_COMPLETE: "openCookbook" },
              },
              openCookbook: {
                  entry: "CookBook", //website opening state
                  on: { SPEAK_COMPLETE: "IdleEnd" }, //done
              },
              IdleEnd: {
                entry: "GUI.PageLoaded", //done
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
          value: { utterance: "Hello and welcome to TasteTraverse. My name is Alfredo and I'm here to help you prepare your desired meal! Think of me as your personal chef." },
        });
      },
      "speak.how-can-I-help": ({ context }) =>
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "How can I help you?" },
        }),
        CookBook: ({ context }) => {
            window.open(`https://www.cookingclassy.com/?s=${context.what}`,"_blank")
        },
      "gui.PageLoaded": ({}) => {
        document.getElementById("button").innerText = "Click to start!";
        document.querySelector(".animation-speaking").classList.remove("active");
        document.querySelector(".animation-listening").classList.remove("active");
        document.querySelector(".animation-speaking").classList.add("hidden");
        document.querySelector(".animation-listening").classList.add("hidden");
      },
      "gui.Inactive": ({}) => {
        document.getElementById("button").innerText = "Inactive";
        document.querySelector(".animation-speaking").classList.remove("active");
        document.querySelector(".animation-listening").classList.remove("active");
        document.querySelector(".animation-speaking").classList.add("hidden");
        document.querySelector(".animation-listening").classList.add("hidden");
      },
      "gui.Idle": ({}) => {
        document.getElementById("button").innerText = "Idle";
        document.querySelector(".animation-speaking").classList.remove("active");
        document.querySelector(".animation-listening").classList.remove("active");
        document.querySelector(".animation-speaking").classList.add("hidden");
        document.querySelector(".animation-listening").classList.remove("hidden");
      },
      "gui.Speaking": ({}) => {
        document.getElementById("button").innerText = "Speaking...";
        document.getElementById("button").className = "speakWave";
        document.querySelector(".animation-speaking").classList.add("active");
        document.querySelector(".animation-speaking").classList.remove("hidden");
        document.querySelector(".animation-listening").classList.remove("active");
        document.querySelector(".animation-listening").classList.add("hidden");
      },
      "gui.Listening": ({}) => {
        document.getElementById("button").innerText = "Listening...";
        document.getElementById("button").className = "listening";
        document.querySelector(".animation-speaking").classList.remove("active");
        document.querySelector(".animation-speaking").classList.add("hidden");
        document.querySelector(".animation-listening").classList.add("active");
        document.querySelector(".animation-listening").classList.remove("hidden");
      },
    },
  },
);

const actor = createActor(dmMachine).start();

document.getElementById("button").onclick = () => actor.send({ type: "CLICK" });


actor.subscribe((state) => {
  console.log(state.value);
});

