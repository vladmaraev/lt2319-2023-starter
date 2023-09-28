import { createMachine, createActor, assign, fromPromise } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "51a782b6273c4bebb54d1e04b0e108e0",
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

interface Grammar {
  [index: string]: {
    entities: {
      [index: string]: string;
    };
   },
  };

const grammar: Grammar = {
  "i don't want to know about these things": {
    entities: {
      answer: "no"
    },
  },
  "no" : {
    entities: {
      answer: "no",
    },
  },
  "no, thank you" : {
    entities: {
      answer: "no",
    },
  },
  "i don't want to" : {
    entities: {
      answer: "no",
    },
  },
  "i don't" : {
    entities: {
      answer: "no",
    },
  },
  "no i don't" : {
    entities: {
      answer: "no",
    },
  },
  "tell me about the plot": {
    entities: {
      answer: "yes",
      what: "plot"
    },
  },
  "yes the plot": {
    entities: {
      answer: "yes",
      what: "plot"
    },
  },
  "the plot": {
    entities: {
      answer: "yes",
      what: "plot"
    },
  },
  "the mood": {
    entities: {
      answer: "yes",
      what: "mood"
    },
  },
  "no I already know that": {
    entities: {
      answer: "no",
    },
  },
  "no you told me already": {
    entities: {
      answer: "no",
    },
  },
  "ok": {
    entities: {
      answer: "yes",
      what: "both"
    },
  },
  "yes": {
    entities: {
      answer: "yes",
      what: "both"
    },
  },
  "yes, please" : {
    entities: {
      answer: "yes",
    },
  },
  "yeah tell me about the plot" : {
    entities: {
      answer: "yes",
      what: "plot"
    },
  },
  "yes, tell me about its plot" : {
    entities: {
      answer: "yes",
      what: "plot"
    },
  },
  "yes, tell me about its plot please" : {
    entities: {
      answer: "yes",
      what: "plot"
    }
  },
  "yes, tell me about its mood" : {
    entities: {
      answer: "yes",
      what: "mood"
    },
  },
  "tell me about the mood" : {
    entities: {
      answer: "yes",
      what: "mood"
    },
  },
  "tell me about the general feel" : {
    entities: {
      answer: "yes",
      what: "mood",
    },
  },
  "what is the general feel": {
    entities: {
      answer: "yes",
      what: "mood",
    },
  },
  "tell me about both" : {
    entities: {
      answer: "yes",
      what: "both",
    },
  },
};

//the following function is not used in the code
const getEntities = (sentence: string) => {
  const result = [];
  const entities = grammar[sentence].entities
  const sent = sentence.toLowerCase().replace(/\.$/g, "").split(" ")
  for (let i = 0; i < sent.length; i++) {
    if (sent[i] in entities) {
      result.push(sent[i]);
      return result
    }
  }
  return false;
};

const getDialogues = (user: string, gpt: string) => {
  const dialogues = {users: [], gptAnswers: []}
  dialogues.users.push(user);
  dialogues.gptAnswers.push(gpt);
  console.log(dialogues)
  return dialogues
};

const lower = (sentence : string) => {
  let u = sentence.toLowerCase().replace(/\.$/g, "");
  return u 
}

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
                on: { SPEAK_COMPLETE: "HowCanIHelp"},
              },
              HowCanIHelp: {
                entry: ({context}) => {
                  context.spstRef.send({
                    type: "SPEAK", 
                    value:{utterance: "What are you in the mood for reading today?"},
                  });
                },
                on: { SPEAK_COMPLETE: "Ask" },
              },
              Ask: {
                entry: listen(),
                on: {
                  RECOGNISED: [
                  {
                   target: "chatGPT",
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        lastResult: ({event}) => event.value,
                      }),
                    ],
                  }],
                },
              },
              chatGPT: {
                invoke: {
                  src: fromPromise(async({input}) => {  
                    //inside the gpt function + I have already read that book + the ${context.bookName} if it's possible to use context
                    // there like this
                   const gptAnswer = await fetchFromChatGPT(`this utterance contains what I seek to read ${input.lastResult[0].utterance}. 
                      Give me your suggestion of one book in a JSON file with entities like bookName, bookAuthor, bookGenre, bookMood, and bookPlot. 
                      Try to be diverse and don't answer if the utterance is a question`, 250);
                   return gptAnswer; 
                  }),
                  input: ({context, event}) => ({
                    lastResult: context.lastResult,
                  }),
                  onDone: {
                    target: "success",
                    actions: [
                      ({ event }) => console.log(event.output),
                      assign({
                        gptzAnswer: ({ event }) => event.output,
                        bookName: ({ event }) => JSON.parse(event.output).bookName,
                        bookAuthor: ({ event }) => JSON.parse(event.output).bookAuthor,
                        bookGenre: ({ event }) => JSON.parse(event.output).bookGenre,
                        bookMood: ({ event }) => JSON.parse(event.output).bookMood,
                        bookPlot: ({ event }) => JSON.parse(event.output).bookPlot
                      })
                    ]
                  },
                },
              },
              success: {
                entry: ({context}) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `The book I would suggest you read is ${context.bookName} by ${context.bookAuthor}. It is a very nice ${context.bookGenre} book! Would you like to know more about the book's plot or its general mood?` },
                  });
                },
                on: { SPEAK_COMPLETE: "yesNo" }
              },
              yesNo: {
                entry: listen(),
                on: {
                  RECOGNISED: [
                   {
                    target: "wantMood",
                    guard: ({context, event}) => {
                      const sent = lower(event.value[0].utterance);
                      if (sent in grammar) {
                        if ( grammar[sent].entities.answer == "yes" && context.plotDone == "yes" ) {
                          return true
                        }
                      }
                      return false
                    },
                   },
                   {
                    target: "wantPlot",
                    guard: ({context, event}) => {
                      const sent = lower(event.value[0].utterance);
                      if (sent in grammar) {
                        if ( grammar[sent].entities.answer == "yes" && context.moodDone == "yes" ) {
                          return true
                        }
                      }
                      return false
                    },
                   },
                   {
                    target: "plot",
                    guard: ({ context, event }) => {
                      const sent = lower(event.value[0].utterance);
                      if (sent in grammar) {
                        if ( grammar[sent].entities.answer == "yes" && context.moodDone == "yes" || grammar[sent].entities.answer == "yes" && grammar[sent].entities.what == "plot") {
                          return true
                        }
                      }
                      return false
                    },
                    actions: [
                      ({ event }) => console.log(event.output),
                      assign({
                        plotDone: ({ event }) => "yes",
                      })
                    ]
                   },
                   {
                    target: "mood",
                    guard: ({context, event}) => {
                      const sent = lower(event.value[0].utterance);
                      if (sent in grammar) {
                        if (grammar[sent].entities.answer == "yes" && grammar[sent].entities.what == "mood") {
                          return true
                        }
                      }
                      return false
                    },
                    actions: [
                      ({ event }) => console.log(event.output),
                      assign({
                        moodDone: ({ event }) => "yes",
                      })
                    ]
                   },
                   {
                    target: "both",
                    guard: ({event}) => {
                      const sent = lower(event.value[0].utterance);
                      if (sent in grammar) {
                        if (grammar[sent].entities.answer == "yes" && grammar[sent].entities.what == "both") {
                          return true
                        }
                      }
                      return false
                    },
                   },
                   {
                    target: "goodbye",
                    guard: ({event}) => {
                      const sent = lower(event.value[0].utterance);
                      if (sent in grammar) {
                        if (grammar[sent].entities.answer == "no") {
                          return true
                        }
                      }
                      return false
                    },
                   },
                   {
                    target: "noEntiendo",
                     actions: [
                       ({ event }) => console.log(event),
                       assign({
                         lastResult: ({event}) => event.value,
                       }),
                     ],
                   },
                   ],
                },
              },
              noEntiendo: {
                entry: ({context}) => {
                  context.spstRef.send({
                    type: "SPEAK", 
                    value:{utterance: "I don't think I got that correctly. Would you like me to tell you about its plot or its mood?"},
                  });
                },
                on: { SPEAK_COMPLETE: "yesNo" },
              },
              plot: {
                entry: ({context}) => {
                  context.spstRef.send({
                    type: "SPEAK", 
                    value:{utterance: `${context.bookPlot}. Would you like to learn the book's mood set?`},
                  });
                },
                on: { SPEAK_COMPLETE: "yesNo" },
              },
              mood: {
                entry: ({context}) => {
                  context.spstRef.send({
                    type: "SPEAK", 
                    value:{utterance: `${context.bookName} is considered a ${context.bookMood} book. Would you like to hear its plot?`},
                  });
                },
                on: { SPEAK_COMPLETE: "yesNo" },
              },
              both: {
                entry: ({context}) => {
                  context.spstRef.send({
                    type: "SPEAK", 
                    value:{utterance: `${context.bookPlot}. The book is considered to be ${context.bookMood}.`},
                  });
                },
                on: { SPEAK_COMPLETE: "goodbye" },
                
              },
              wantMood: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `The mood of ${context.bookName} is described as ${context.bookMood}.`},
                  });
                },
                on : { SPEAK_COMPLETE: "goodbye" }
              },
              wantPlot: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `The plot of ${context.bookName} is this. ${context.bookPlot}.`},
                  });
                },
                on : { SPEAK_COMPLETE: "goodbye" }  
              },
              goodbye: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    //last part of this utterance would make more sense if I could make this system available to other people and save their chat. 
                    //I'm implementing it now because I think it would be a nice feature and I want to see how it works and how the dialogue evolves                    
                    value: { utterance: `Hope this information makes you more excited about reading this book! Enjoy your read!`}, //PS. If you want take some time to chat with me about books and help me collect dialogues between users and me, it would help a lot! What do you say?"`}, 
                  });
                },
                //on : { SPEAK_COMPLETE: "yesOrNo" } 
              },
              // yesOrNo: {
              //   entry: listen(),
              //   on: {
              //     RECOGNISED: [
              //     {
              //       target: "bye",
              //       guard: ({ context, event }) => {
              //         const sent = lower(event.value[0].utterance);
              //         if (sent in grammar || null) {
              //           if ( grammar[sent].entities.answer == "no") {
              //             return true
              //           }
              //         }
              //         return false
              //       },
              //      },
              //      {
              //       target: "chatWithGPT",
              //       guard: ({context, event}) => {
              //         const sent = lower(event.value[0].utterance);
              //         if (sent in grammar) {
              //           if ( grammar[sent].entities.answer == "yes") {
              //             return true
              //           }
              //         }
              //         return false
              //       },
              //      }],
              //   },
              // },
              // chatWithGPT: {
              //   invoke: {
              //     src: fromPromise(async({input}) => {  
              //       //inside the gpt function + I have already read that book + the ${context.bookName} if it's possible to use context
              //       // there like this
              //      const gptAnswer = await fetchFromChatGPT(`Let's discuss about ${input.lastResult[0].utterance} but keep it very concise please`, 150);
              //      return gptAnswer; 
              //     }),
              //     //this doesn't really work because it keeps the utterance used in the very beginning of the state machine and I couldn't figure out a way to use the context.bookName or context.bookAuthor
              //     input: ({context, event}) => ({
              //       lastResult: context.lastResult,
              //     }),
              //     onDone: {
              //       target: "speak",
              //       actions: [
              //         ({ context, event }) => console.log(event.output),
              //         assign({
              //           gptzAnswer: ({ event }) => event.output,
              //         })
              //       ]
              //     },
              //   },
              // },
              // speak: {
              //   entry: ({context}) => {
              //     context.spstRef.send({
              //       type: "SPEAK",
              //       value: { utterance: `${context.gptzAnswer}` },
              //     });
              //     actions: [
              //       ({ context, event }) => console.log(event.output),
              //       assign({
              //         dialogues: ({ event }) => getDialogues(event.value[0].utterance, context.gptzAnswer),
              //       })
              //     ]
              //   },
              //   on: { SPEAK_COMPLETE: "chatWithGPT" }
              // },
              // bye: {
              //   entry: ({ context }) => {
              //     context.spstRef.send({
              //       type: "SPEAK",
              //       value: { utterance: "Ok! It was nice talking to you"},
              //     });
              //   },
              // },
              IdleEnd: {},
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
          value: { utterance: "Hello!" }, //I am here to help you find your next read! I can recommend you books based on your personal preferences." },
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
    temperature: 0.5,
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
}
