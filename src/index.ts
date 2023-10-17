import { createMachine, createActor, assign, raise } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "9cd3cbcc05da4e198c3ba6b680d52ec4",
};

const settings: Settings = {
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  locale: "en-US",
  asrDefaultNoInputTimeout: 5000,
  ttsDefaultVoice: "en-US-EricNeural",
};

interface DMContext {
  spstRef?: any;
  lastResult?: Hypothesis[];
}

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


//interface Grammar {
//  [index: string]: {
//    entities: {
//      [index: string]: string;
//    };
//   },
//  };


//movie ticket booking --> slots: movie name, date, showtime [extra: num of tickets, seat number]

// This function converts the input sentence to lowecase, removes any period at the end of the sentence and splits it
// into an array of words (wordsInSent). If target word in sentence --> True, else --> False
//const checkWordExists = (targetWord: string, inputSentence: string) => {
//  const wordsInSent = inputSentence.toLowerCase().replace(/\.$/g, "").split(/\s+/);
//  console.log(targetWord, wordsInSent);
//  return wordsInSent.includes(targetWord);
//};

//const grammar = {
//    entities: {
//      movie: "titanic",
//      date: "friday",
//      showtime: "7:00",
//    },
//  }

const grammar = {
    entities: {
    movie: ["barbie", "titanic", "avatar"],
    date: ["tonight", "tomorrow", "friday"],
    showtime: ["7:00", "7 pm", "10:00"],
    },
  };


  //var list = grammar.entities.movie;
  //for (var elem of list) {
  //  console.log(elem);
  //}



//const checkWordExists2 = (entity: string, inputSentence: string) => {
//  const cleanedInput = inputSentence.toLowerCase().replace(/\.$/g, "").split(/\s+/);
//  console.log(cleanedInput)
//  var listEntity = grammar2.entities[entity];
//  for (var word of listEntity) {
//    //const cleanedInput = inputSentence.toLowerCase().replace(/\.$/g, "");
//    for (var token of cleanedInput) {
//      if (word.match(token)) {
//        return true;
//    }
//    }
//  }
//
//  return false;
//  //if (word in grammar.entities[entity]) {
//    //const matchingWord = grammar.entities[entity].find(word =>
//      //cleanedInput.includes(word.toLowerCase())
//    //);
//    
//    //return true;
//  //}
//  //return false; // Return false if the entity is not found or no matching word
//};


//const checkWordExists3 = (entity: string, inputSentence: string, returnWord = false) => {
//  const cleanedInput = inputSentence.toLowerCase().replace(/\.$/g, "").split(/\s+/);
//  const entityList = grammar.entities[entity];
//  let matchingWord = "";
//
//  for (const word of cleanedInput) {
//    if (entityList.includes(word)) {
//      matchingWord = word
//      console.log(entity, matchingWord)
//    }
//  }
//  if (returnWord && matchingWord) {
//    return [true, matchingWord]; // Return the matching word if found
//  } else if (matchingWord) {
//    return true;
//  }
//  return false;
//};




const checkWordExists = (entity: string, inputSentence: string) => {
  const cleanedInput = inputSentence.toLowerCase().replace(/\.$/g, "").split(/\s+/);
  const entityList = grammar.entities[entity];

  for (const word of cleanedInput) {
    console.log('word: ', word)
    if (entityList.includes(word)) {
      return true;
    }
  }
  return false;
};


console.log(checkWordExists("movie", "I love Barbie."))



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
                entry: "speak.greeting",
                on: { SPEAK_COMPLETE: "Ask" },
              },
              //HowCanIHelp: {
              //  entry: say("How can I help you?"),
              //  on: { SPEAK_COMPLETE: "Ask" },
              //},
              Ask: {
                entry: listen(),
                on: {
                  RECOGNISED: [{
                    // All slots together
                    target: "AllSlots",
                    guard: ({ event }) => checkWordExists("movie", event.value[0].utterance) 
                    && checkWordExists("date", event.value[0].utterance) 
                    && checkWordExists("showtime", event.value[0].utterance),
                    actions:
                      assign({
                        Movie: ({ context }) => (grammar.entities.movie),
                        Date: ({ context }) => (grammar.entities.date),
                        Showtime: ({ context }) => (grammar.entities.showtime),
                      }),
                    },
                    {
                      target: "MissingMovie",
                      guard: ({ event }) => !checkWordExists("movie", event.value[0].utterance),
                      actions:
                        assign({
                          Date: ({ event }) => {
                            if (checkWordExists("date", event.value[0].utterance)) {
                              return grammar.entities.date;
                            }
                          },
                          Showtime: ({ event }) => {
                            if (checkWordExists("showtime", event.value[0].utterance)) {
                              return grammar.entities.showtime;
                            }
                          },
                        }),
                    },
                    {
                      target: "MissingDate",
                      guard: ({ event }) => !checkWordExists("date", event.value[0].utterance),
                      actions:
                        assign({
                          Movie: ({ event }) => {
                            if (checkWordExists("movie", event.value[0].utterance)) {
                              return grammar.entities.movie;
                            }
                          },
                          Showtime: ({ event }) => {
                            if (checkWordExists("showtime", event.value[0].utterance)) {
                              return grammar.entities.showtime;
                            }
                          },
                        }),
                    },
                    {
                      target: "MissingShowtime",
                      guard: ({ event }) => !checkWordExists("showtime", event.value[0].utterance),
                      actions:
                        assign({
                          Movie: ({ event }) => {
                            if (checkWordExists("movie", event.value[0].utterance)) {
                              return grammar.entities.movie;
                            }
                          },
                          Date: ({ event }) => {
                            if (checkWordExists("date", event.value[0].utterance)) {
                              return grammar.entities.date;
                            }
                          },
                        }),
                    },
                  ],   
                },
              },
              AllSlots: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {utterance: `Sure! I will book a ticket for ${context.Movie} on ${context.Date} at ${context.Showtime}`}
                    //value: { utterance: "Sure! I will book a ticket for " + context.Movie + " on " + context.Date + " at " + context.Showtime },
                  });
                },
              },
              MissingMovie: { entry: raise({ type: "FILL_MOVIE"}) },
              MissingDate: { entry: raise({ type: "FILL_DATE"}) },
              MissingShowtime: { entry: raise({ type: "FILL_SHOWTIME"}) },
              IdleEnd: {},
            },
          },
        },
      },
      SlotMovie: {
        initial: "Idle",
        states: {
          Idle: { on: { FILL_MOVIE: "Greeting" }},
          Greeting: {
            entry: ({ context }) => {
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: "What movie do you want to watch?" },
              });
            },
            on: { SPEAK_COMPLETE: "Ask" },
          },
          Ask: {
            entry: listen(),
            on: {
              RECOGNISED: [
                {  //3 transition paths (#root AllSlots/SlotDate/SlotShowtime) based on guard conditions
                  target: "#root.DialogueManager.Ready.AllSlots",
                  guard: ({ event, context }) => checkWordExists("movie", event.value[0].utterance) 
                  && (!!context.Date || checkWordExists("date", event.value[0].utterance)) 
                  && (!!context.Showtime || checkWordExists("showtime", event.value[0].utterance)),
                  actions: assign({ 
                    Movie: () =>
                      (grammar.entities.movie),
                    Date: ({ event, context }) => {
                      if (context.Date) {
                        return context.Date;
                      }
                      else if (checkWordExists("date", event.value[0].utterance)) {
                        return grammar.entities.date;
                      };
                    },
                    Showtime: ({ event, context }) => {
                      if (context.Showtime) {
                        return context.Showtime;
                      }
                      else if (checkWordExists("showtime", event.value[0].utterance)) {
                        return grammar.entities.showtime;
                      };
                    },
                    }),
                  },
                {
                  target: "#root.SlotDate.Greeting",
                  guard: ({ event, context }) => checkWordExists("movie", event.value[0].utterance) 
                  && !context.Date 
                  && !checkWordExists("date", event.value[0].utterance),
                  actions: assign({ 
                    Movie: ({ context }) =>
                      (grammar.entities.movie),
                  }),
                },
                {
                  target: "#root.SlotShowtime.Greeting",
                  guard: ({ event, context }) => checkWordExists("movie", event.value[0].utterance) 
                  && !context.Showtime,
                  actions: assign({ 
                    Movie: ({ context }) =>
                      (grammar.entities.movie),
                    Date: ({ event, context }) => {
                      if (context.Date) {
                        return context.Date;
                      } else if (checkWordExists("date", event.value[0].utterance)) {
                        return grammar.entities.date;
                      };
                    },
                  }),
                },
              ], 
            },
          },
        },
      },
      SlotDate: {
        initial: "Idle",
        states: {
          Idle: { on: { FILL_DATE: "Greeting" } },
          Greeting: {
            entry: ({ context }) => {
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: "When do you want to go to the cinema?"},
              });
            },
            on: { SPEAK_COMPLETE: "Ask" },
          },
          Ask: {
            entry: listen(),
            on: { RECOGNISED: [{
              target: "#root.DialogueManager.Ready.AllSlots",
              guard: ({ event, context }) => checkWordExists("date", event.value[0].utterance) 
              && !!context.Movie 
              && (!!context.Showtime || checkWordExists("showtime", event.value[0].utterance)), 
              actions: assign({
                Date: ({ context }) => grammar.entities.date,
                Showtime: ({ event, context }) => {
                  if (context.Showtime) {
                    return context.Showtime;
                  } else if (checkWordExists("showtime", event.value[0].utterance)) {
                    return grammar.entities.showtime;
                  };
                }
              }),
            },
            {
              target: "#root.SlotShowtime.Greeting",
              guard: ({ event }) => checkWordExists("date", event.value[0].utterance) 
              && !checkWordExists("showtime", event.value[0].utterance), 
              actions: assign({
                Date: ({ context }) => grammar.entities.date,
              }),
            },
            ],
            },
          },
        },
      },
      SlotShowtime: {
        initial: "Idle",
        states: {
          Idle: { on: { FILL_SHOWTIME: "Greeting" } },
          Greeting: {
            entry: ({ context }) => {
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `What time do you want to watch ${context.Movie} on ${context.Date}?`},
              });
              console.log(context.Movie);
            },
            on: { SPEAK_COMPLETE: "Ask" },
          },
          Ask: {
            entry: listen(),
            on: { RECOGNISED: {
              target: "#root.DialogueManager.Ready.AllSlots",
            guard: ({ event, context }) => checkWordExists("showtime", event.value[0].utterance) 
            && !!context.Movie 
            && !!context.Date,
            actions: assign({
              Showtime: ({ context }) => grammar.entities.showtime,
            }),
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
    actions: {
      prepare: ({ context }) =>
        context.spstRef.send({
          type: "PREPARE",
        }),
      // saveLastResult:
      "speak.greeting": ({ context }) => {
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "Hi there! How can I help you?" },
        });
      },
      //"speak.how-can-I-help": ({ context }) =>
      //  context.spstRef.send({
      //    type: "SPEAK",
      //    value: { utterance: "How can I help you?" },
      //  }),
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

actor.subscribe((state) => {
  console.log(state.value);
});