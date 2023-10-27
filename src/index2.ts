import { fromPromise, createMachine, createActor, assign } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";


const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "7acaf819fba24847b9cc341042eea53e",
};

const settings: Settings = {
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  locale: "ro-RO",
  asrDefaultNoInputTimeout: 5000,
  ttsDefaultVoice: "ro-RO-EmilNeural",
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

const say_eng =
  (text: string, voice: string) =>
  ({ context }) => {
    context.spstRef.send({
      type: "SPEAK",
      value: { utterance: text, voice: voice },
    });
  };


const listen =
  () =>
  ({ context }) =>
    context.spstRef.send({
      type: "LISTEN",
    });


    // defining the slots
  const entities = {
    grid1_1: null,
    grid1_2: null,
    grid1_3: null,
    grid2_1: null,
    grid2_2: null,
    grid2_3: null,
    grid3_1: null,
    grid3_2: null,
    grid3_3: null,
  };

// machine
const dmMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QCcD2qAuA6AIgSwEMAbVKAVzAFkCA7AmZLABWTAAcDWBiAQQGUASgBUhfAPoCAojxwBNANoAGALqJQbVLDwY8qGmpAAPRACYAzIqwAOK4pPmA7AFYXVswE4zAGhABPRACMDmbWVp5mZk4AbAGKZgAsik4Avsk+aJi4hCTkVLT0YIwCYAQQvlgA4qxgOjRQXHxM0gDSYgDCAPKUTAAykkKSSqpIIBpaOnoGxggR8VgO8QsmiopR9vHxAU4+-ghR7g5Y7k6K8e7xZlG2a-Gp6ejY+MSkFNR0DFjFpeUAEqgA7m1aABJH5gIhsBpNHitTrdPoDIYGMbaXT6EbTfZzJwBCxXeK2Byndw7RD7Q7HYkXK6rEy3NIgDKPbIvPLvQqfEplLBgiHFNglDBQlrtLq9fqDFTIzSoyYY0xOQ5xAImbZ+RC2JxYCzuKz7S7XOl3RkPLLPXJvApFLnlHiwADWXCknQqADlgXxJDgkSMURN0aBpsEtQEovF7O5Q1Eoit4qSEE4TFEsEmrAFI4p3CY3ItjUyzTlXvkPl9ufzBcKYaL4RKfeoZf6pmTzlgcXirATFESzvGw1YsLiHLqiREzA486anoW2VbOd9OQKCELGiK4eLEQFhvXxmimwgHFZDtHNscTJGrNm4+qEIt+6n07EszmFhPMlPWZaSzasMCaAAzVAxAAMRqABjAALLgID0MAsDwGgADdUHtWD83fC1iw5Utyl-ADgLA8CEHgpDQKXNEhjrUYG13eUECTEI4jMDsPHOAJEiieM9UOFVzH1GkblfZlzSLdlrXnXDAJAjAIK4Qo0EYNgiCXADkAAWywNCWQw0S525CT8OkwjiNQUj-QoqVfWouVA1MKIGIiZj3FY9j4yc-t03vPVDXpe43y0kTZ2wrA7XtMQACEwEKJ1JBdd1PW9Czt1lAMjAVJUzBVNVdgCWITFbDY6WpbzBILD9MLE7kIsKMQJMrWExQRSUtyondrNSujFSwZVVXjFVLiwNZeM8fijQZTThJnL95yq5Aav-VA6urddBk3aVWpS6ZVXSzLerPfsLgJPjirG00KgAVWBZgCh6VBSkgLg2h6YE2maSi-Romy6IOeY03sOxlgyxVvGvdxM2sHELhyxQAj1bMSvOy7fwIUCdAQsBeEEERxCkGQFESlrkr3bMQhjUM4mzaMnDMExdo8bUTgfEwco8RV4Yu4KUbwNGfwgIh0axsQ+CEHhhC9N6rI2xAMryhwriZ8MLjHIJeucOZllxMNgjPE5xxOzIEY51HYOBXn0f4ARBeF0WEua962umaX5jlti6QiBxlevUMCSOaGwgWaJbFDNnLp4Tnub4Rd7Xg+oVyrNdGvF9a90d2WLxdxX3YcFXTm1GwrCB3VVSsYPDa52CejwWAMDAGho+i2KPTF-G7clmYqawE9llVM902CXqnCcrqwg8aH7EfMxUgZGhUAgOADCZNbCdogBaNir12ZfzCOJynLPRQL0iRNdd8oTp0-QpF8bFf3A4687O1CNlniOzzgcIcohK9CAo+Fh2E4MBL4fXag4GmnsTgDXiE4NwTFLi4hyiYT+-lJpYRtIA+2iBl4EnjCPI4kDzCRD1FsVYiCJrnwquUKokVahQDQa3HKWc74LHmKsQuXZzBMwCCQs+5VdK-ABECGgoJwRsFoXuKmWo7KXkWKqFUARexMKJPsC8bDqY5S4WVHSQVeRsHLEuURtFFC9S2HMRRrCQGqM4XrU+GjArfhCvoz6oMtQeHzkOBIsCogMN2NEPKh4056kTB4Y+Jo-KkJ4UFHAMEHHtUMZ7CIyYVhhigfsKB0QJ5WNKtpWx85dEYGidMKmlhJHnETOeS88YXB5WpAPHEacYjuHUVkqael5oGQgvkxAsTsrSKOG4OwOVjj5zso07+KD5y-1gDXah4VIrIA6QgLpgQohODVheM4B50weDYiM5B5DgoOhmRfSyScDG9TcFqKBvcNjhizNGHZZDeFYBmnNAC8zFl0WhsmGwbEcSrDDDEYuGSv67MeSbPmkgaAQHmV7UImxEg30jLqD2uwYjJiZksMcz8mLu2DvMpmnF7BdVWExGG9gEjEIyQbJg11bqzyhccpen0QGuTBtTcIng950mCfmA2SMw4AIZVfT6h5dqhgHH8g8kZogrJ8iE7ABtQ5G3mfsfuOd2ImAWOcWYJdFVlx5nzaFyKlkrCOJEYICxTh-VlTy9murw6R2jvMtsA0qZ2TCLSAkWUlnfTsHqZZXYzXmB1fyrAFcq410dYKoBBTcQusuExUGNx8790jPMHuEQ2LBAOJPZIQA */
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
                on: { SPEAK_COMPLETE: [{ target: "HowCanIHelp",
                actions: assign({grid1_1: null, grid1_2:null, grid1_3:null,grid2_1: null, grid2_2:null, grid2_3:null,grid3_1: null, grid3_2:null, grid3_3:null })},
              ] },
              },
              HowCanIHelp: {

                entry: say_eng("And I am Ryan, and together we will help you learn some Romanian words. The purpose of the game is the following: Emilian will say a Romanian word and you must press the tile with an image of that word. There is no problem if you don't get it right the first time, you will see that Emilian has plenty of pacience.","en-GB-RyanNeural"),
                on: { SPEAK_COMPLETE: "Grid_1_1" },
              },

                    Grid_1_1: {
                        entry: ({ context }) => {
                            
                            context.spstRef.send({
                                type: "SPEAK",
                                value: { utterance: "Apasă pe raton." },
                            });
                        },
                        on: {
                            GRID_ITEM_CLICKED: [
                                {
                                    target: "Grid_1_2",
                                    guard: ({ event })=> event.gridItem === "1",
                                    actions: [( event) => console.log('GRID_ITEM_CLICKED event detected:', event),
                                    'highlightCorrect',
                                    
                                    assign({
                                        grid1_1: (context) => "racoon",
                                        grid_status: (context) => true,
                                          
                                      }),  
                                      
                                      ],
                                },
                                {
                                    target: "Grid_1_1",
                                    actions: [( event) => console.log('GRID_ITEM_CLICKED event detected:', event),
                                    'highlightIncorrect',
                                    say_eng("Let's try it again, here's a hint, it's a furry rodent", "en-GB-RyanNeural"),
                                    assign({
                                        grid_status: (context) => false  
                                      }), 
                                      ],

                                },
                            ],
                        },
                    },
                    Grid_1_2: {
                        entry: ({ context }) => {
                            
                            context.spstRef.send({
                                type: "SPEAK",
                                value: { utterance: "Apasă pe banană." },
                            });
                        },
                        on: {
                            GRID_ITEM_CLICKED: [
                              {
                                  target: "Grid_1_3",
                                  guard: ({ event })=> event.gridItem === "2",
                                  actions: [( event) => console.log('GRID_ITEM_CLICKED event detected:', event),
                                  'highlightCorrect',
                                  assign({
                                      grid1_1: (context) => "banana",
                                      grid_status: (context) => true,
                                        
                                    }),  
                                    
                                    ],
                              },
                              {
                                  target: "Grid_1_2",
                                  actions: [( event) => console.log('GRID_ITEM_CLICKED event detected:', event),
                                  'highlightIncorrect',
                                  say_eng("Let's try it again, here's a hint, it's a yellow fruit", "en-GB-RyanNeural"),
                                  assign({
                                      grid_status: (context) => false  
                                    }),  
                                    ],

                              },
                          ],
                        },
                    },
                    Grid_1_3: {
                        entry: ({ context }) => {
                           
                            context.spstRef.send({
                                type: "SPEAK",
                                value: { utterance: "Apasă pe carte." },
                            });
                        },
                        on: {
                            GRID_ITEM_CLICKED: [
                              {
                                  target: "Grid_2_1",
                                  guard: ({ event })=> event.gridItem === "3",
                                  actions: [( event) => console.log('GRID_ITEM_CLICKED event detected:', event),
                                  'highlightCorrect',
                                  assign({
                                      grid1_1: (context) => "book",
                                      grid_status: (context) => true,
                                       
                                    }), 
                                    
                                    ],
                              },
                              {
                                  target: "Grid_1_3",
                                  actions: [( event) => console.log('GRID_ITEM_CLICKED event detected:', event),
                                  'highlightIncorrect',
                                  say_eng("Let's try it again, here's a hint, Harry Potter is also one.=", "en-GB-RyanNeural"),
                                  assign({
                                      grid_status: (context) => false  
                                    }),  
                                    ],

                              },
                          ],
                        },
                    },
                    Grid_2_1: {
                        entry: ({ context }) => {
                            console.log(context.kind, context.taste, context.alc);
                            context.spstRef.send({
                                type: "SPEAK",
                                value: { utterance: "Apasă pe fluture." },
                            });
                        },
                        on: {
                            GRID_ITEM_CLICKED: [
                              {
                                  target: "Grid_2_2",
                                  guard: ({ event })=> event.gridItem === "4",
                                  actions: [( event) => console.log('GRID_ITEM_CLICKED event detected:', event),
                                  'highlightCorrect',
                                  assign({
                                      grid1_1: (context) => "butterfly",
                                      grid_status: (context) => true,
                                       
                                    }), 
                                    
                                    ],
                              },
                              {
                                  target: "Grid_2_1",
                                  actions: [( event) => console.log('GRID_ITEM_CLICKED event detected:', event),
                                  'highlightIncorrect',
                                  say_eng("Let's try it again, here's a hint, it's a colorful flying insect", "en-GB-RyanNeural"),
                                  assign({
                                      grid_status: (context) => false  
                                    }),  
                                    ],

                              },
                          ],
                        },
                    },
                    Grid_2_2: {
                        entry: ({ context }) => {
                            console.log(context.kind, context.taste, context.alc);
                            context.spstRef.send({
                                type: "SPEAK",
                                value: { utterance: "Apasă pe autobuz." },
                            });
                        },
                        on: {
                            GRID_ITEM_CLICKED: [
                              {
                                  target: "Grid_2_3",
                                  guard: ({ event })=> event.gridItem === "5",
                                  actions: [( event) => console.log('GRID_ITEM_CLICKED event detected:', event),
                                  'highlightCorrect',
                                  assign({
                                      grid1_1: (context) => "bus",
                                      grid_status: (context) => true,
                                        
                                    }),  
                                    
                                    ],
                              },
                              {
                                  target: "Grid_2_2",
                                  actions: [( event) => console.log('GRID_ITEM_CLICKED event detected:', event),
                                  'highlightIncorrect',
                                  say_eng("Let's try it again, here's a hint, Vesttraffic is notorius for their delays.", "en-GB-RyanNeural"),
                                  assign({
                                      grid_status: (context) => false  
                                    }),  
                                    ],

                              },
                          ],
                        },
                    },
                    Grid_2_3: {
                        entry: ({ context }) => {
                            console.log(context.kind, context.taste, context.alc);
                            context.spstRef.send({
                                type: "SPEAK",
                                value: { utterance: "Apasă pe bombă." },
                            });
                        },
                        on: {
                            GRID_ITEM_CLICKED: [
                              {
                                  target: "Grid_3_1",
                                  guard: ({ event })=> event.gridItem === "6",
                                  actions: [( event) => console.log('GRID_ITEM_CLICKED event detected:', event),
                                  'highlightCorrect',
                                  assign({
                                      grid1_1: (context) => "bomb",
                                      grid_status: (context) => true,
                                        
                                    }),  
                                    
                                    ],
                              },
                              {
                                  target: "Grid_2_3",
                                  actions: [( event) => console.log('GRID_ITEM_CLICKED event detected:', event),
                                  'highlightIncorrect',
                                  say_eng("Let's try it again, here's a hint, its onomatopea is boom!", "en-GB-RyanNeural"),
                                  assign({
                                      grid_status: (context) => false  
                                    }),  
                                    ],

                              },
                          ],
                        },
                    },
                    Grid_3_1: {
                        entry: ({ context }) => {
                            console.log(context.kind, context.taste, context.alc);
                            context.spstRef.send({
                                type: "SPEAK",
                                value: { utterance: "Apasă pe omidă." },
                            });
                        },
                        on: {
                            GRID_ITEM_CLICKED: [
                              {
                                  target: "Grid_3_2",
                                  guard: ({ event })=> event.gridItem === "7",
                                  actions: [( event) => console.log('GRID_ITEM_CLICKED event detected:', event),
                                  'highlightCorrect',
                                  assign({
                                      grid1_1: (context) => "catterpilar",
                                      grid_status: (context) => true,
                                        
                                    }),  
                                    
                                    ],
                              },
                              {
                                  target: "Grid_3_1",
                                  actions: [( event) => console.log('GRID_ITEM_CLICKED event detected:', event),
                                  'highlightIncorrect',
                                  say_eng("Let's try it again, here's a hint, it turns into an insect which you've already clicked", "en-GB-RyanNeural"),
                                  assign({
                                      grid_status: (context) => false  
                                    }),  
                                    ],

                              },
                          ],
                        },
                    },
                    Grid_3_2: {
                        entry: ({ context }) => {
                            console.log(context.kind, context.taste, context.alc);
                            context.spstRef.send({
                                type: "SPEAK",
                                value: { utterance: "Apasă pe zimbru." },
                            });
                        },
                        on: {
                            GRID_ITEM_CLICKED: [
                              {
                                  target: "Grid_3_3",
                                  guard: ({ event })=> event.gridItem === "8",
                                  actions: [( event) => console.log('GRID_ITEM_CLICKED event detected:', event),
                                  'highlightCorrect',
                                  assign({
                                      grid1_1: (context) => "buffalo",
                                      grid_status: (context) => true,
                                        
                                    }),  
                                    
                                    ],
                              },
                              {
                                  target: "Grid_3_2",
                                  actions: [( event) => console.log('GRID_ITEM_CLICKED event detected:', event),
                                  'highlightIncorrect',
                                  say_eng("Let's try it again, here's a hint, it's an endagered animal", "en-GB-RyanNeural"),
                                  assign({
                                      grid_status: (context) => false  
                                    }),  
                                    ],

                              },
                          ],
                        },
                    },
                    Grid_3_3: {
                        entry: ({ context }) => {
                            console.log(context.kind, context.taste, context.alc);
                            context.spstRef.send({
                                type: "SPEAK",
                                value: { utterance: "Apasă pe liliac." },
                            });
                        },
                        on: {
                            GRID_ITEM_CLICKED: [
                              {
                                  target: "Game_End",
                                  guard: ({ event })=> event.gridItem === "9",
                                  actions: [( event) => console.log('GRID_ITEM_CLICKED event detected:', event),
                                  'highlightCorrect',
                                  say_eng("Congratulations, you've passed all our challenges!", "en-GB-RyanNeural"),
                                  assign({
                                      grid1_1: (context) => "bat",
                                      grid_status: (context) => true,
                                        
                                    }),  
                                    
                                    ],
                              },
                              {
                                  target: "Grid_3_3",
                                  actions: [( event) => console.log('GRID_ITEM_CLICKED event detected:', event),
                                  'highlightIncorrect',
                                  say_eng("Let's try it again, here's a hint, it's a the only flying mammal", "en-GB-RyanNeural"),
                                  assign({
                                      grid_status: (context) => false  
                                    }),  
                                    ],

                              },
                          ],
                        },
                    },
              Game_End: {
                entry: ({ context }) => {
                    context.spstRef.send({
                      type: "SPEAK",
                      value: {
                        utterance: `Felicitări, acum ești un expert licențiat în limba română!`
                      }
                    });
                  },
                  on: {
                    SPEAK_COMPLETE: "IdleEnd"
                  }
              },
              IdleEnd: {}
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
      highlightCorrect:  ({ context, event }) => {
        const gridItem = document.querySelector(`[data-grid-item="${event.gridItem}"]`);
        gridItem.classList.add('correct-click');
        setTimeout(() => {
          gridItem.classList.remove('correct-click');
        }, 500);
      },
      
      highlightIncorrect:  ({ context, event }) => {
        const gridItem = document.querySelector(`[data-grid-item="${event.gridItem}"]`);
        gridItem.classList.add('incorrect-click');
        setTimeout(() => {
          gridItem.classList.remove('incorrect-click');
        }, 500);
      },
      
      prepare: ({ context }) =>
        context.spstRef.send({
          type: "PREPARE",
        }),
      // saveLastResult:
      "speak.greeting": ({ context }) => {
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "Salutare, eu sunt Emilian!" },
        });
      },
      "speak.how-can-I-help": ({ context }) =>
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "Now we will play a game." },
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


export default actor;
let gridItems = document.querySelectorAll('#container > div');
  
gridItems.forEach(item => {
  item.addEventListener('click', function() {
    actor.send({
      type: 'GRID_ITEM_CLICKED',
      gridItem: this.dataset.gridItem
    });
  });
});

document.getElementById("button").onclick = () => actor.send({ type: "CLICK" });

actor.subscribe((state) => {
  console.log(state.value);
});

