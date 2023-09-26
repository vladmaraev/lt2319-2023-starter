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


    // defining the slots
const extractEntities = (utterance) => {
  const entities = {
    kind: null,
    taste: null,
    alc: null,
  };

  const words = utterance.split(' ');

  // hardcoding the slot detection criteria
  words.forEach((word, index) => {
    if (["ipa", "lager", "ale", "pilsner", "dark", "white", "brown", "porter", 'stout'].includes(word)) {
      entities.kind = word;
    }
    if (["sour", "sweet", "bready", "bitter", "fruity", "coffee-like", "chocolate",].includes(word)) {
      entities.taste = word;
    }
    if (["strong", "weak", "average","medium","low", "high","normal"].includes(word)) {
      entities.alc = word;
    }
  });

  return entities;
};
async function fetchFromChatGPT(prompt: string, max_tokens: number) {
  const myHeaders = new Headers();
  myHeaders.append(
    "Authorization",
    "Bearer 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",
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
                actions: assign({kind: null, taste:null, alc:null })},
              ] },
              },
              HowCanIHelp: {

                entry: say("What sort of beer would you like?"),
                on: { SPEAK_COMPLETE: "Ask" },
              },
              HelpRepeat: {

                entry: say("I couldn't find what you were looking for, please ask for something else?"),
                on: { SPEAK_COMPLETE: "Ask" },
              },
              Ask: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: "Repeat",
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        lastResult: ({ event }) => event.value,
                      }),
                    ],
                  },
                },
              },
              Done: {
                type: 'final'
                    },
              Repeat: {
                entry: ({ context }) => {
                  const entities = extractEntities(context.lastResult[0].utterance.toLowerCase());
                  console.log(context.lastResult[0].utterance)
                  
                  // updating the context with extracted entities
                  context.kind = entities.kind || context.kind;
                  context.taste = entities.taste || context.taste;
                  context.alc = entities.alc || context.alc;

                  console.log(context.kind, context.taste, context.alc);
              
                  // selecting the correct prompt based on the missing slot
                  if (!context.kind) {
                    context.spstRef.send({
                      type: "SPEAK",
                      value: { utterance: "What kind of beer would you like?" },
                    });
                  } else if (!context.taste) {
                    context.spstRef.send({
                      type: "SPEAK",
                      value: { utterance: "How should it taste?" },
                    });
                  } else if (!context.alc) {
                    context.spstRef.send({
                      type: "SPEAK",
                      value: { utterance: "How strong would you like it to be" },
                    });
                  } else {
                    context.spstRef.send({
                      type: "SPEAK",
                      value:{ utterance: `Very well, I will bring you a ${context.alc} ${context.taste} ${context.kind} beer` },
                    });
                  }
                },
                on: { SPEAK_COMPLETE: [
                  {
                    target:"Info_Fetch",
                    guard: ({ context })=> context.kind && context.taste && context.alc
                  },
                  {target:"Ask",
                  },
]
                },
                
              },
              Info_Fetch: {
                invoke: {
                  src: fromPromise(async ({input}) => {

          // Constructing the prompt string based on the received input 
          const max_tokens = 300; 
          console.log(input.alc)
          
          const prompt = `Could you please provide details about some beers that match the following criteria: taste as ${input.taste}, alcohol content as ${input.alc}, and type as ${input.alc}? I am interested in learning about the flavor notes, any specific brands, and the origin of such beers. Could you list at least 3 examples? Also, please format the answer as a JSON`;
          
          
          const response = await fetchFromChatGPT(prompt, max_tokens);

          try {
            console.log('Type of GPT Response:', typeof response);
            return response;
        } catch (error) {
            console.error('Parsing Error:', error, 'Invalid JSON:', response);
            throw error; 
        }
        
          
        }, ),
        onDone: {
          target: 'Presenting_Beer', // specify the next state to transition to
          actions: [({ event }) => console.log(JSON.parse(event.output)),
            assign({
            beer1: ({ event }) => {
              console.log('Event:', event); // log the entire event object
              return JSON.parse(event.output);
            }
          })]
        },
        onError: {
          // specify what to do if there is an error
          target: 'HelpRepeat',
          actions: assign({
            errorMessage: ({ event }) => event.data
          })
        },
        input: ({ context, event }) => ({
          // Pass necessary parameters from context or event to the input of the invoked function
          taste: context.taste,
          alc: context.alc,
          kind: context.kind,
                  }),
                  
                },
                

              },
              Presenting_Beer: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {
                      utterance: `In that case, I believe that ${context.beer1.beers[0].name}, ${context.beer1.beers[1].name} and ${context.beer1.beers[2].name} would suit your taste. Would you like to know more about any of them ?`
                    }
                  });
                },
                on: {
                  SPEAK_COMPLETE: "Ask_Beer"
                }
              },
              Ask_Beer: {
                entry: listen(),
                on: {
                  RECOGNISED: {
                    target: "Beer_Info",
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        lastResult_beer: ({ event }) => event.value,
                      }),
                    ],
                  },
                },
              },
              
            Beer_Info: {
              entry: ({ context }) => {

                

                const beer_names = {
                  type1: context.beer1.beers[0].name,
                  type2: context.beer1.beers[1].name,
                  type3: context.beer1.beers[2].name,
                };
              
                console.log(beer_names.type1)
                
                // updating the context with extracted entities
                context.type1 = beer_names.type1 || context.type1;
                context.type2 = beer_names.type2 || context.type2;
                context.type3 = beer_names.type3 || context.type3;

                console.log(context.type1, context.type2, context.type3);
            
                // selecting the correct prompt based on the missing slot

              if (context.lastResult_beer[0].utterance.toLowerCase().includes("all")) {
                context.spstRef.send({
                  type: "SPEAK",
                  value: { utterance: `Very well, for ${context.type1} made by  ${context.beer1.beers[0].brand} sports an alcohol content of ${context.beer1.beers[0].alcohol_content}
                  it is a ${context.beer1.beers[0].type} from ${context.beer1.beers[0].origin} with a flavour of ${context.beer1.beers[0].flavor_notes},
                  for ${context.type2} made by  ${context.beer1.beers[1].brand} sports an alcohol content of ${context.beer1.beers[1].alcohol_content}
                  it is a ${context.beer1.beers[1].type} from ${context.beer1.beers[1].origin} with a flavour of ${context.beer1.beers[1].flavor_notes}
                  and for ${context.type3} made by  ${context.beer1.beers[2].brand} sports an alcohol content of ${context.beer1.beers[2].alcohol_content}
                  it is a ${context.beer1.beers[2].type} from ${context.beer1.beers[2].origin} with a flavour of ${context.beer1.beers[2].flavor_notes}` }
                });
              }
                 else if ((context.lastResult_beer[0].utterance.toLowerCase().includes("first") && context.lastResult_beer[0].utterance.toLowerCase().includes("second")) || context.lastResult_beer[0].utterance.toLowerCase().includes(context.type1) && context.lastResult_beer[0].utterance.toLowerCase().includes(context.type2)) {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Very well, for ${context.type1} made by  ${context.beer1.beers[0].brand} sports an alcohol content of ${context.beer1.beers[0].alcohol_content}
                    it is a ${context.beer1.beers[0].type} from ${context.beer1.beers[0].origin} with a flavour of ${context.beer1.beers[0].flavor_notes},
                    and for ${context.type2} made by  ${context.beer1.beers[1].brand} sports an alcohol content of ${context.beer1.beers[1].alcohol_content}
                    it is a ${context.beer1.beers[1].type} from ${context.beer1.beers[1].origin} with a flavour of ${context.beer1.beers[1].flavor_notes}` },
                  });
                } else if ((context.lastResult_beer[0].utterance.toLowerCase().includes("first") && context.lastResult_beer[0].utterance.toLowerCase().includes("third")) || context.lastResult[0].utterance.toLowerCase().includes(context.type1) && context.lastResult[0].utterance.toLowerCase().includes(context.type3)) {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Very well, for ${context.type1} made by  ${context.beer1.beers[0].brand} sports an alcohol content of ${context.beer1.beers[0].alcohol_content}
                    it is a ${context.beer1.beers[0].type} from ${context.beer1.beers[0].origin} with a flavour of ${context.beer1.beers[0].flavor_notes},
                    and for ${context.type3} made by  ${context.beer1.beers[2].brand} sports an alcohol content of ${context.beer1.beers[2].alcohol_content}
                    it is a ${context.beer1.beers[2].type} from ${context.beer1.beers[2].origin} with a flavour of ${context.beer1.beers[2].flavor_notes}` },
                  });
                } else if ((context.lastResult_beer[0].utterance.toLowerCase().includes("2nd") && context.lastResult_beer[0].utterance.toLowerCase().includes("3rd")) || context.lastResult[0].utterance.toLowerCase().includes(context.type2) && context.lastResult[0].utterance.toLowerCase().includes(context.type3)) {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Very well, for ${context.type2} made by  ${context.beer1.beers[1].brand} sports an alcohol content of ${context.beer1.beers[1].alcohol_content}
                    it is a ${context.beer1.beers[1].type} from ${context.beer1.beers[1].origin} with a flavour of ${context.beer1.beers[1].flavor_notes},
                    and for ${context.type3} made by  ${context.beer1.beers[2].brand} sports an alcohol content of ${context.beer1.beers[2].alcohol_content}
                    it is a ${context.beer1.beers[2].type} from ${context.beer1.beers[2].origin} with a flavour of ${context.beer1.beers[2].flavor_notes}` },
                  });
                }
                 else if (context.lastResult_beer[0].utterance.toLowerCase().includes("first") || context.lastResult[0].utterance.toLowerCase().includes(context.type1)) {
                    context.spstRef.send({
                      type: "SPEAK",
                      value: { utterance: `Very well, for ${context.type1} made by  ${context.beer1.beers[0].brand} sports an alcohol content of ${context.beer1.beers[0].alcohol_content}
                      it is a ${context.beer1.beers[0].type} from ${context.beer1.beers[0].origin} with a flavour of ${context.beer1.beers[0].flavor_notes}` },
                    });
                  }
  
                 else if (context.lastResult_beer[0].utterance.toLowerCase().includes("second") || context.lastResult[0].utterance.toLowerCase().includes(context.type2)) {
                    context.spstRef.send({
                      type: "SPEAK",
                      value: { utterance: `Very well, for ${context.type2} made by  ${context.beer1.beers[1].brand} sports an alcohol content of ${context.beer1.beers[1].alcohol_content}
                      it is a ${context.beer1.beers[1].type} from ${context.beer1.beers[1].origin} with a flavour of ${context.beer1.beers[1].flavor_notes}` },
                    });
                  }
                   else if (context.lastResult_beer[0].utterance.toLowerCase().includes("third") || context.lastResult[0].utterance.toLowerCase().includes(context.type3)) {
                      context.spstRef.send({
                        type: "SPEAK",
                        value: { utterance: `Very well, for ${context.type3} made by  ${context.beer1.beers[3].brand} sports an alcohol content of ${context.beer1.beers[3].alcohol_content}
                        it is a ${context.beer1.beers[3].type} from ${context.beer1.beers[3].origin} with a flavour of ${context.beer1.beers[3].flavor_notes}` },
                        });
                } else {
                  context.spstRef.send({
                      type: "SPEAK",
                      value: { utterance: `Very well, would you like to ask for another kind of beer?` },
                  });
              
                  context.BeerFlag = true; // Directly assign true to BeerFlag property of context
                  console.log(context.BeerFlag); // Log the value of BeerFlag
              }
              
              },
              on: { SPEAK_COMPLETE: [
                {target:"Final_Beer",
                guard: ({ context })=> context.BeerFlag == true
                },
                {
                  target:"Done",
                  //guard: ({ context })=> context.kind && context.taste && context.alc
                },

                ]
              },
              
            },
            Final_Beer: {
              entry: listen(),
              on: {
                RECOGNISED: {
                  target: "Final_Beer_Info",
                  actions: [
                    ({ event }) => console.log(event),
                    assign({
                      lastResult_beer: ({ event }) => event.value,
                    }),
                  ],
                },
              },
            },
            Final_Beer_Info: {
              entry: ({ context }) => {

                if (context.lastResult_beer[0].utterance.toLowerCase().includes("no")){
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Very well` },
                  });
                  assign({
                    BeerFlag: (context) => false // 
                  });
                } else {
                  assign({
                    BeerFlag: (context) => true // 
                  });
                }
              },
              on: { SPEAK_COMPLETE: [
                {target:"Done",
                guard: ({ context })=> context.BeerFlag == false
                },
                {
                  target:"Greeting",
            
                },

                ]
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
      prepare: ({ context }) =>
        context.spstRef.send({
          type: "PREPARE",
        }),
      // saveLastResult:
      "speak.greeting": ({ context }) => {
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "Hello user!" },
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
