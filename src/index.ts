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
  ttsDefaultVoice: "en-GB-RyanNeural",
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


//movie ticket booking --> slots: movie name, date, showtime [extra: num of tickets, seat number]

interface Grammar {
  [index: string]: {
    entities: {
      [index: string]: string;
    };
   },
  };

//const grammar = {
//  "put the red book on the table": {
//    color: "red",
//    what: "book",
//    where: "table",
//  },
//};


//Examples of requests for movie ticket booking with all three slots (movie name, date, and showtime):
//"I would like to book tickets for the movie 'Barbie' on Friday at 7:00 PM."
//"Can I reserve seats for the movie 'Barbie' on Sunday at 3:30 PM?"
//"I want to see 'Titanic' this Saturday at 5:00 PM. Can you help me with that?"

//Examples of incomplete requests:
//“I want to watch the movie ‘Barbie’" (missing slots: date, showtime)
//"I need two tickets for tomorrow." (missing slots: movie name, showtime)
//"What movies are playing on Friday?" (missing slots: movie name, showtime)

const grammar: Grammar = {
  "I would like to book tickets for the movie 'Barbie' on Friday at 7 pm": {
    entities: {
      movie: "barbie",
      date: "friday",
      showtime: "7 pm",
    },
  },
  "I want to watch a movie on Saturday": {
    entities: {
      date: "saturday",
    },
  },
  "I want to watch the movie 'Barbie'": {
    entities: {
      movie: "barbie",
    },
  },
  "what movies are playing at the cinema at 7 pm?": {
    entities: {
      showtime: "7 pm",
    },
  },
  "I want to watch 'Titanic' on Tuesday": {
    entities: {
      movie: "titanic",
      date: "tuesday",
    },
  },
  "I would like to go to the cinema on Friday at 8 pm": {
    entities: {
      date: "friday",
      showtime: "8 pm",
    },
  },
  "I can watch 'Titanic' at 8 pm": {
    entities: {
      movie: "titanic",
      showtime: "8 pm",
    },
  },
};

// This function converts the input sentence to lowecase, removes any period at the end of the sentence and splits it
// into an array of words (wordsInSent). If target word in sentence --> True, else --> False
const checkWordExists = (targetWord: string, inputSentence: string) => {
  const wordsInSent = inputSentence.toLowerCase().replace(/\.$/g, "").split(/\s+/);
  console.log(targetWord, wordsInSent);
  return wordsInSent.includes(targetWord);
};


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
                on: { SPEAK_COMPLETE: "HowCanIHelp" },
              },
              HowCanIHelp: {
                entry: say("How can I help you?"),
                on: { SPEAK_COMPLETE: "Ask" },
              },
              Ask: {
                entry: listen(),
                on: {
                  RECOGNISED: [{
                    // All slots together
                    target: "AllSlots",
                    guard: ({ event }) => checkWordExists(grammar.entities.movie, event.value[0].utterance) && checkWordExists(grammar.entities.date, event.value[0].utterance) && checkWordExists(grammar.entities.showtime, event.value[0].utterance),
                    actions:
                      assign({
                        Movie: ({ event }) => (grammar.entities.movie),
                        Date: ({ event }) => (grammar.entities.date),
                        Showtime: ({ event }) => (grammar.entities.showtime),
                      }),
                    },
                    {
                      target: "MissingMovie",
                      guard: ({ event }) => !checkWordExists(grammar.entities.movie, event.value[0].utterance),
                      actions:
                        assign({
                          //Date: ({ event }) => checkWordExists(grammar.entities.date, event.value[0].utterance) ? grammar.entities.date : undefined //ternary expression = condition ? exprIfTrue : exprIfFalse
                          Date: ({ event }) => {
                            if (checkWordExists(grammar.entities.date, event.value[0].utterance)) {
                              return grammar.entities.date;
                            }
                          },
                          Showtime: ({ event }) => {
                            if (checkWordExists(grammar.entities.showtime, event.value[0].utterance)) {
                              return grammar.entities.showtime;
                            }
                          },
                        }),
                    },
                    {
                      target: "MissingDate",
                      guard: ({ event }) => !checkWordExists(grammar.entities.date, event.value[0].utterance),
                      actions:
                        assign({
                          Movie: ({ event }) => {
                            if (checkWordExists(grammar.entities.movie, event.value[0].utterance)) {
                              return grammar.entities.movie;
                            }
                          },
                          Showtime: ({ event }) => {
                            if (checkWordExists(grammar.entities.showtime, event.value[0].utterance)) {
                              return grammar.entities.showtime;
                            }
                          },
                        }),
                    },
                    {
                      target: "MissingShowtime",
                      guard: ({ event }) => !checkWordExists(grammar.entities.showtime, event.value[0].utterance),
                      actions:
                        assign({
                          Movie: ({ event }) => {
                            if (checkWordExists(grammar.entities.movie, event.value[0].utterance)) {
                              return grammar.entities.movie;
                            }
                          },
                          Date: ({ event }) => {
                            if (checkWordExists(grammar.entities.date, event.value[0].utterance)) {
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
                    value: {utterance: "Sure! I will book a ticket for ${context.Movie} on ${context.Date} at ${context.Showtime}"}
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
      //SlotMovie
      //SlotDate
      //SlotShowtime

      //        Repeat: {
      //          entry: ({ context }) => {
      //            context.spstRef.send({
      //              type: "SPEAK",
      //              value: { utterance: context.lastResult[0].utterance },
      //            });
      //          },
      //          on: { SPEAK_COMPLETE: "Ask" },
      //        },
      //        IdleEnd: {},
      //      },
      //    },
      //  },
      //},
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
          value: { utterance: "Hi there!" },
        });
      },
      "speak.how-can-I-help": ({ context }) =>
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "How can I help you?" },
        }),
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