import { createMachine, createActor, assign } from "xstate";
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
  "i want to read a novel by milan kundera on my kindle": {
    entities: {
      genre: "novel",
      author: "milan kundera",
      media: "e-book",
    },
  },
  "i want to read a novel" : {
    entities: {
      genre: "novel",
    },
  },
  "novel" : {
    entities: {
      genre: "novel",
    },
  },
  "i want to read a milan kundera book": {
    entities: {
      author: "milan kundera",
    },
  },
  "milan kundera": {
    entities: {
      author: "milan kundera",
    },
  },
  "i want to read an ebook" : {
    entities: {
      media: "ebook",
    },
  },
  //for some reason audiobook was not being recognised
  "hardcover" : {
    entities: {
      media: "hardcover",
    },
  },
  "i want to read philosophical fiction by milan kundera" : {
    entities: {
      genre: "philosophical fiction",
      author: "milan kundera",
    },
  },
  "i want to read a novel on my kindle": {
    entities: {
      genre: "novel",
      media: "e-book",
    },
  },
  "i want to hear a milan kundera book" : {
    entities: {
      author: "milan kundera",
      media: "audiobook",
    },
  },
};

//wasn't able to use it as I couldn't figure out a way to distinguish between the entities it would extract
const getEntities = (entity:string, sentence: string) => {
  let u = sentence.toLowerCase().replace(/\.$/g, "");
  const words = u.split(' ')
  const entities = {genre: "nothing", author: "nothing", media: "nothing"}
  const authors = ["milan kundera", "jane austen"]
  const genres = ["philosophical fiction", "novel"]
  const media = ["hardcover", "ebook"]
  
  if (u in grammar) {
    if (entity in words)
    {
      return grammar[u].entities}
      else {
        return false
    }
  }
}

// if (sent in grammar) {
//   if ("genre" in grammar[sent].entities) {
//     console.log(grammar[sent].entities["genre"])
//     return true

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
                    value:{utterance: "What genre of book are you interested in reading today?"},
                  });
                },
                on: { SPEAK_COMPLETE: "Ask" },
              },
              noMatch: {
                entry: say("I am sorry I didn't quite catch that. What book genre do you want to read?"),
                on: { SPEAK_COMPLETE: "Ask" },
              },
              Ask: {
                entry: listen(),
                on: {
                  RECOGNISED: [
                    {
                    target: "SuggestBook",
                    guard: ({event}) => {
                      const sent = lower(event.value[0].utterance);
                      if (sent in grammar) {
                        if ("genre" in grammar[sent].entities && "author" in grammar[sent].entities && "media" in grammar[sent].entities) {
                          console.log(grammar[sent].entities["genre"])
                          return true
                        }
                      }
                      return false
                    },
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        bookGenre: ({event}) => {
                        const sentence = lower(event.value[0].utterance)
                        grammar[sentence].entities["genre"]},
                        bookAuthor: ({event}) => {
                          const sentence = lower(event.value[0].utterance)
                          grammar[sentence].entities["author"]},
                        bookMedia: ({event}) => {
                          const sentence = lower(event.value[0].utterance)
                          grammar[sentence].entities["media"]},
                        //lastResult: ({ event }) => event.value,
                      }),
                    ],
                  },
                  { target: "giveGenre",
                    guard: ({event}) => {
                      const sent = lower(event.value[0].utterance);
                      if (sent in grammar) {
                        if ("author" in grammar[sent].entities && "media" in grammar[sent].entities) {
                          console.log(grammar[sent].entities["author"])
                          return true
                        }
                      }
                      return false
                    },
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        bookAuthor: ({context, event}) => {
                        const sentence = lower(event.value[0].utterance)
                        grammar[sentence].entities["author"]},
                        bookMedia: ({context, event}) => {
                          const sentence = lower(event.value[0].utterance)
                          grammar[sentence].entities["media"]},
                        //lastResult: ({ event }) => event.value,
                      }),
                    ],
                  },
                  {
                    target: "askForMedia",
                    guard: ({event}) => {
                      const sent = lower(event.value[0].utterance);
                      if (sent in grammar) {
                        if ("genre" in grammar[sent].entities && "author" in grammar[sent].entities) {
                          console.log(grammar[sent].entities["genre"])
                          return true
                        }
                      }
                      return false
                    },
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        bookGenre: ({event}) => {
                          const sentence = lower(event.value[0].utterance)
                          grammar[sentence].entities["genre"]},
                        bookAuthor: ({event}) => {
                          const sentence = lower(event.value[0].utterance)
                          grammar[sentence].entities["author"]},
                        //lastResult: ({ event }) => event.value,
                      }),
                    ],                 
                  },
                  { target: "giveAuthor",
                    guard: ({event}) => {
                      const sent = lower(event.value[0].utterance);
                      if (sent in grammar) {
                        if ("genre" in grammar[sent].entities && "media" in grammar[sent].entities) {
                          console.log(grammar[sent].entities["genre"])
                          return true
                        }
                      }
                      return false
                    },
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        bookGenre: ({event}) => {
                        const sentence = lower(event.value[0].utterance)
                        grammar[sentence].entities["genre"]},
                        bookMedia: ({event}) => {
                          const sentence = lower(event.value[0].utterance)
                          grammar[sentence].entities["media"]},
                        //lastResult: ({ event }) => event.value,
                      }),
                    ],
                  },
                  { target: "onlyGenre",
                    guard: ({event}) => {
                      const sent = lower(event.value[0].utterance);
                      if (sent in grammar) {
                        if ("genre" in grammar[sent].entities) {
                          console.log(grammar[sent].entities["genre"],event.bookGenre)
                          return true
                        }
                      }
                      return false
                    },
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        bookGenre: ({event}) => {
                        const sentence = lower(event.value[0].utterance)
                        grammar[sentence].entities["genre"]},
                      }),
                    ],
                  },
                  { target: "onlyAuthor",
                    guard: ({event}) => {
                      const sent = lower(event.value[0].utterance);
                      if (sent in grammar) {
                        if ("author" in grammar[sent].entities) {
                          console.log(grammar[sent].entities["author"])
                          return true
                        }
                      }
                      return false
                    },
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        bookAuthor: ({event}) => {
                        const sentence = lower(event.value[0].utterance)
                        grammar[sentence].entities["author"]},
                      }),
                    ],
                  },
                  { target: "onlyMedia",
                    guard: ({event}) => {
                      const sent = lower(event.value[0].utterance);
                      if (sent in grammar) {
                        if ("media" in grammar[sent].entities) {
                          console.log(grammar[sent].entities["media"])
                          return true
                        }
                      }
                      return false
                    },
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        bookMedia: ({event}) => {
                        const sentence = lower(event.value[0].utterance)
                        grammar[sentence].entities["media"]},
                      }),
                    ],
                  },
                  {
                    target: "noMatch",
                  }],
                },
              },
              onlyMedia: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: "Please, tell me what is the author you want to read?" },
                  });
                },
                on: { SPEAK_COMPLETE: "askAuthor2" }},
                  askAuthor2: {
                    entry: listen(), 
                    on: {
                      RECOGNISED: [
                        //both
                        {
                        target: "SuggestBook",
                        guard: ({event}) => {
                          const sent = lower(event.value[0].utterance);
                          if (sent in grammar) {
                            if ("author" in grammar[sent].entities && "genre" in grammar[sent].entities) {
                              console.log(grammar[sent].entities["genre"])
                              return true
                            }
                          }
                          return false
                        },
                        actions: [
                          ({ event }) => console.log(event.bookMedia),
                          assign({
                            bookGenre: ({event}) => {
                              const sentence = lower(event.value[0].utterance)
                              grammar[sentence].entities["genre"]},
                            bookAuthor: ({event}) =>{
                              const sentence = lower(event.value[0].utterance)
                              grammar[sentence].entities["author"]}
                          }),
                        ],
                      },
                      //media, => author & genre // only author
                      {
                        target: "giveGenre",
                        guard: ({event}) => {
                          const sent = lower(event.value[0].utterance);
                          if (sent in grammar) {
                            if ("author" in grammar[sent].entities) {
                              console.log(grammar[sent].entities["author"])
                              return true
                            }
                          }
                          return false
                        },
                        actions: [
                          ({ event }) => console.log(event),
                          assign({
                            bookGenre: ({event}) => {
                              const sentence = lower(event.value[0].utterance)
                              grammar[sentence].entities["genre"]},
                          }),
                        ],
                      }],
                    },
                  },
                  giveGenre: {
                    entry: ({ context }) => {
                      context.spstRef.send({
                        type: "SPEAK",
                        //I don't find it very natural that the system asks for the genre after it has learned the author's name, as
                        //someone would expect an author to only write one genre, but for the sake of the assignment I will leave it
                        //like this
                        value: { utterance: "What is your favorite genre?" },
                      });
                    },
                    on: { SPEAK_COMPLETE: "giveGen" }},
                      giveGen: {
                        entry: listen(), 
                        on: {
                          RECOGNISED: [
                            {
                            target: "SuggestBook",
                            guard: ({event}) => {
                              const sent = lower(event.value[0].utterance);
                              if (sent in grammar) {
                                if ("genre" in grammar[sent].entities) {
                                  console.log(grammar[sent].entities["media"])
                                  return true
                                }
                              }
                              return false
                            },
                            actions: [
                              ({ event }) => console.log(event),
                              assign({
                                bookGenre: ({event}) => {
                                  const sentence = lower(event.value[0].utterance)
                                  grammar[sentence].entities["genre"]}
                              }),
                            ],
                          }],
                        },
                      },
                      giveAuthor: {
                        entry: ({ context }) => {
                          context.spstRef.send({
                            type: "SPEAK",
                            //I don't find it very natural that the system asks for the genre after it has learned the author's name, as
                            //someone would expect an author to only write one genre, but for the sake of the assignment I will leave it
                            //like this
                            value: { utterance: "Tell me the author" },
                          });
                        },
                        on: { SPEAK_COMPLETE: "giveAuth" }},
                          giveAuth: {
                            entry: listen(), 
                            on: {
                              RECOGNISED: [
                                {
                                target: "SuggestBook",
                                guard: ({event}) => {
                                  const sent = lower(event.value[0].utterance);
                                  if (sent in grammar) {
                                    if ("author" in grammar[sent].entities) {
                                      console.log(grammar[sent].entities["author"])
                                      return true
                                    }
                                  }
                                  return false
                                },
                                actions: [
                                  ({ event }) => console.log(event),
                                  assign({
                                    bookAuthor: ({event}) => {
                                      const sentence = lower(event.value[0].utterance)
                                      grammar[sentence].entities["author"]}
                                  }),
                                ],
                              }],
                            },
                          },         
              onlyAuthor: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    //I don't find it very natural that the system asks for the genre after it has learned the author's name, as
                    //someone would expect an author to only write one genre, but for the sake of the assignment I will leave it
                    //like this
                    value: { utterance: "What is your favorite genre?" },
                  });
                },
                on: { SPEAK_COMPLETE: "askGen" }},
                  askGen: {
                    entry: listen(), 
                    on: {
                      RECOGNISED: [
                        {
                        target: "SuggestBook",
                        guard: ({event}) => {
                          const sent = lower(event.value[0].utterance);
                          if (sent in grammar) {
                            if ("genre" in grammar[sent].entities && "media" in grammar[sent].entities && event.bookAuthor) {
                              console.log(grammar[sent].entities["media"])
                              return true
                            }
                          }
                          return false
                        },
                        actions: [
                          ({ event }) => console.log(event),
                          assign({
                            bookMedia: ({event}) => {
                              const sentence = lower(event.value[0].utterance)
                              grammar[sentence].entities["media"]},
                            bookAuthor: ({event}) =>{
                              const sentence = lower(event.value[0].utterance)
                              grammar[sentence].entities["author"]}
                          }),
                        ],
                      },
                      {
                        target: "askForMedia",
                        guard: ({event}) => {
                          const sent = lower(event.value[0].utterance);
                          if (sent in grammar) {
                            if ("genre" in grammar[sent].entities) {
                              console.log(grammar[sent].entities["genre"])
                              return true
                            }
                          }
                          return false
                        },
                        actions: [
                          ({ event }) => console.log(event),
                          assign({
                            bookGenre: ({event}) => {
                              const sentence = lower(event.value[0].utterance)
                              grammar[sentence].entities["genre"]},
                          }),
                        ],
                      }],
                    },
                  },     
              onlyGenre: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: "What author would you like to discover today?" },
                  });
                },
                on: { SPEAK_COMPLETE: "askAuth" }},
                  askAuth: {
                    entry: listen(), 
                    on: {
                      RECOGNISED: [
                        {
                        target: "SuggestBook",
                        guard: ({event}) => {
                          const sent = lower(event.value[0].utterance);
                          if (sent in grammar) {
                            if ("author" in grammar[sent].entities && "media" in grammar[sent].entities) {
                              console.log(grammar[sent].entities["media"])
                              return true
                            }
                          }
                          return false
                        },
                        actions: [
                          ({ event }) => console.log(event),
                          assign({
                            bookMedia: ({event}) => {
                              const sentence = lower(event.value[0].utterance)
                              grammar[sentence].entities["media"]},
                            bookAuthor: ({event}) =>{
                              const sentence = lower(event.value[0].utterance)
                              grammar[sentence].entities["author"]}
                          }),
                        ],
                      },
                      {
                        target: "askForMedia",
                        guard: ({event}) => {
                          const sent = lower(event.value[0].utterance);
                          if (sent in grammar) {
                            if ("author" in grammar[sent].entities) {
                              console.log(grammar[sent].entities["author"])
                              return true
                            }
                          }
                          return false
                        },
                        actions: [
                          ({ event }) => console.log(event),
                          assign({
                            bookAuthor: ({event}) => {
                              const sentence = lower(event.value[0].utterance)
                              grammar[sentence].entities["author"]},
                          }),
                        ],
                      }],
                    },
                  },
              askForGenre: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: "What genre do you prefer?" },
                  });
                },
                on: { SPEAK_COMPLETE: "askGenre" }},
                  askGenre: {
                    entry: listen(), 
                    on: {
                      RECOGNISED: [
                        {
                        target: "SuggestBook",
                        guard: ({event}) => {
                          const sent = lower(event.value[0].utterance);
                          if (sent in grammar) {
                            if ("genre" in grammar[sent].entities && "media" in grammar[sent].entities) {
                              console.log(grammar[sent].entities["media"])
                              return true
                            }
                          }
                          return false
                        },
                        actions: [
                          ({ event }) => console.log(event),
                          assign({
                            bookMedia: ({event}) => {
                              const sentence = lower(event.value[0].utterance)
                              grammar[sentence].entities["media"]},
                            bookGenre: ({event}) =>{
                              const sentence = lower(event.value[0].utterance)
                              grammar[sentence].entities["genre"]}
                          }),
                        ],
                      },
                      {
                        target: "askForMedia",
                        guard: ({event}) => {
                          const sent = lower(event.value[0].utterance);
                          if (sent in grammar) {
                            if ("genre" in grammar[sent].entities) {
                              console.log(grammar[sent].entities["media"])
                              return true
                            }
                          }
                          return false
                        },
                        actions: [
                          ({ event }) => console.log(event),
                          assign({
                            bookGenre: ({event}) => {
                              const sentence = lower(event.value[0].utterance)
                              grammar[sentence].entities["genre"]},
                          }),
                        ],
                      }],
                    },
                  },       
              askForAuthor: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: "What author do you have in mind?" },
                  });
                },
                on: { SPEAK_COMPLETE: "askAuthor" }},
                  askAuthor: {
                    entry: listen(), 
                    on: {
                      RECOGNISED: [
                        {
                        target: "SuggestBook",
                        guard: ({event}) => {
                          const sent = lower(event.value[0].utterance);
                          if (sent in grammar) {
                            if ("author" in grammar[sent].entities && "media" in grammar[sent].entities) {
                              console.log(grammar[sent].entities["genre"])
                              return true
                            }
                          }
                          return false
                        },
                        actions: [
                          ({ event }) => console.log(event),
                          assign({
                            bookAuthor: ({event}) => {
                              const sentence = lower(event.value[0].utterance)
                              grammar[sentence].entities["author"]},
                            bookMedia: ({event}) => {
                              const sentence = lower(event.value[0].utterance)
                              grammar[sentence].entities["media"]},
                            //lastResult: ({ event }) => event.value,
                          }),
                        ],
                      },
                      {
                        target: "askForMedia",
                        guard: ({event}) => {
                          const sent = lower(event.value[0].utterance);
                          if (sent in grammar) {
                            if ("author" in grammar[sent].entities) {
                              console.log(grammar[sent].entities["author"])
                              return true
                            }
                          }
                          return false
                        },
                        actions: [
                          ({ event }) => console.log(event),
                          assign({
                            bookAuthor: ({event}) => {
                            const sentence = lower(event.value[0].utterance)
                            grammar[sentence].entities["author"]}
                            //lastResult: ({ event }) => event.value,
                          }),
                        ],                 
                      }],
                    },
                  },
              askForMedia: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: "What format do you want your book in? For example audiobook, e-book, or hardcover?" },
                  });
                },
                on: { SPEAK_COMPLETE: "askMedia" }},
                  askMedia: {
                    entry: listen(), 
                    on: {
                      RECOGNISED: [
                        {
                        target: "SuggestBook",
                        guard: ({event}) => {
                          const sent = lower(event.value[0].utterance);
                          if (sent in grammar) {
                            if ("media" in grammar[sent].entities) {
                              console.log(grammar[sent].entities["media"])
                              return true
                            }
                          }
                          return false
                        },
                        actions: [
                          ({ event }) => console.log(event),
                          assign({
                            bookMedia: ({event}) => {
                              const sentence = lower(event.value[0].utterance)
                              grammar[sentence].entities["media"]},
                          }),
                        ],
                      }],
                    },
                  },        
              SuggestBook: {
                id: "SuggestBook",
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: "Based on your preferences I would suggest you The unbearable lightness of being. You can find it at the City Library" },
                  });
                },
                on: { SPEAK_COMPLETE: "Ask" },
              },
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
