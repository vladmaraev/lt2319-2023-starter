import { createMachine, createActor, assign, fromPromise, raise } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "",
};

const settings: Settings = {
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  locale: "en-US",
  asrDefaultNoInputTimeout: 5000,
  ttsDefaultVoice: "en-GB-RyanNeural",
};

const settings2: Settings = {
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  locale: "de-DE",
  asrDefaultNoInputTimeout: 5000,
  ttsDefaultVoice: "de-DE-KatjaNeural",
};

interface DMContext {
  spstRef?: any;
  lastResult?: Hypothesis[];
  history: string[];
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

    async function fetchFromChatGPT(prompt: string, max_tokens: number) {
      const myHeaders = new Headers();
      myHeaders.append(
        "Authorization",
        "Bearer ",
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

    const ToLowerCase = (sentence: string, entity: string) => {
      console.log(sentence.toLowerCase().replace(/\?$/, ''))
    if (sentence.toLowerCase().replace(/\?$/, '') in grammar) {
      if (entity in grammar[sentence.toLowerCase().replace(/\?$/, '')].entities) {
        return grammar[sentence.toLowerCase().replace(/\?$/, '')].entities[entity];
      }
    }
        return false;
    };


    interface Grammar {
      [key: string]: {
      intent: string;
      entities: {
        [index: string]: string;
      };
    };
  }
const grammar: Grammar = {
  "can you tell me the name": {
    intent: "None",
    entities: { name_JSON: "The name is"},
  },
  "and what about the name": {
    intent: "None",
    entities: { name_JSON: "The name is"},
  },
  "and the name": {
    intent: "None",
    entities: { name_JSON: "The name is"},
  },
  "and can you tell me the name": {
    intent: "None",
    entities: { name_JSON: "The name is"},
  },
  "can you tell me the size": {
    intent: "None",
    entities: { size_JSON: "The size is"},
  },
  "and what about the size": {
    intent: "None",
    entities: { size_JSON: "The size is"},
  },
  "and the size": {
    intent: "None",
    entities: { size_JSON: "The size is"},
  },
  "and can you tell me the size": {
    intent: "None",
    entities: { size_JSON: "The size is"},
  },
  "can you tell me a unique feature": {
    intent: "None",
    entities: { unique_features_JSON: "A unique feature is that"},
  },
  "and what about a unique feature": {
    intent: "None",
    entities: { unique_features_JSON: "A unique feature is that"},
  },
  "and a unique feature": {
    intent: "None",
    entities: { unique_features_JSON: "A unique feature is that"},
  },
  "and can you tell me a unique feature": {
    intent: "None",
    entities: { unique_features_JSON: "A unique feature is that"},
  },
  "can you tell me the distance": {
    intent: "None",
    entities: { distance_JSON: "The distance is"},
  },
  "and what about the distance": {
    intent: "None",
    entities: { distance_JSON: "The distance is"},
  },
  "and the distance": {
    intent: "None",
    entities: { distance_JSON: "The distance is"},
  },
  "and can you tell me the distance": {
    intent: "None",
    entities: { distance_JSON: "The distance is"},
  },
  "can you tell me the age": {
    intent: "None",
    entities: { age_JSON: "The age is"},
  },
  "and what about the age": {
    intent: "None",
    entities: { age_JSON: "The age is"},
  },
  "and the age": {
    intent: "None",
    entities: { age_JSON: "The age is"},
  },
  "and can you tell me the age": {
    intent: "None",
    entities: { age_JSON: "The age is"},
  },
  "can you tell me the radius": {
    intent: "None",
    entities: { radius_JSON: "The radius is"},
  },
  "and what about the radius": {
    intent: "None",
    entities: { radius_JSON: "The radius is"},
  },
  "and the radius": {
    intent: "None",
    entities: { radius_JSON: "The radius is"},
  },
  "and can you tell me the radius": {
    intent: "None",
    entities: { radius_JSON: "The radius is"},
  },
  "can you tell me the brightness": {
    intent: "None",
    entities: { brightness_JSON: "The brightness is"},
  },
  "and what about the brightness": {
    intent: "None",
    entities: { brightness_JSON: "The brightness is"},
  },
  "and the brightness": {
    intent: "None",
    entities: { brightness_JSON: "The brightness is"},
  },
  "and can you tell me the brightness": {
    intent: "None",
    entities: { brightness_JSON: "The brightness is"},
  },
  "can you name a similar object": {
    intent: "None",
    entities: { similar_object_JSON: "A similar object is "},
  },
  "and what about a similar object": {
    intent: "None",
    entities: { similar_object_JSON: "A similar object is "},
  },
  "and a similar object": {
    intent: "None",
    entities: { similar_object_JSON: "A similar object is "},
  },
  "and can you name a similar object": {
    intent: "None",
    entities: { similar_object_JSON: "A similar object is "},
  },
  "can you tell me the composition":{
    intent: "None",
    entities: { composition_JSON: "The composition is"},
  },
  "and what about the composition":{
    intent: "None",
    entities: { composition_JSON: "The composition is"},
  },
  "and the composition":{
    intent: "None",
    entities: { composition_JSON: "The composition is"},
  },
  "and can you tell me the composition":{
    intent: "None",
    entities: { composition_JSON: "The composition is"},
  },
  "can you tell me the role": {
    intent: "None",
    entities: { role_JSON: "The role is"},
  },
  "and what about the role": {
    intent: "None",
    entities: { role_JSON: "The role is"},
  },
  "and the role": {
    intent: "None",
    entities: { role_JSON: "The role is"},
  },
  "and can you tell me the role": {
    intent: "None",
    entities: { role_JSON: "The role is"},
  },
  "can you tell me the solar phenomena": {
    intent: "None",
    entities: { solar_phenomena_JSON: "The solar phenomena is"},
  },
  "and what about the solar phenomena": {
  intent: "None",
  entities: { solar_phenomena_JSON: "The solar phenomena is"},
  },
  "and the solar phenomena": {
    intent: "None",
    entities: { solar_phenomena_JSON: "The solar phenomena is"},
  },
  "and can you tell me the solar phenomena": {
    intent: "None",
    entities: { solar_phenomena_JSON: "The solar phenomena is"},
  },
  "can you tell me an interesting fact": {
    intent: "None",
    entities: { interesting_fact_JSON: "An interesting fact is "},
  },
  "and what about an interesting fact": {
    intent: "None",
    entities: { interesting_fact_JSON: "An interesting fact is "},
  },
  "and an interesting fact": {
    intent: "None",
    entities: { interesting_fact_JSON: "An interesting fact is "},
  },
  "and can you tell me an interesting fact": {
    intent: "None",
    entities: { interesting_fact_JSON: "An interesting fact is "},
  },
  "speak german":{
    intent: "None",
    entities: { switch: "Switched to German"},
  },
  "yes":{
    intent: "None",
    entities: {yes: "Okay"},
  },
  "no": {
    intent: "None",
    entities: {no: "Okay"},
  },
};
// machine
const dmMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QCcD2qAuA6AIgSwEMAbVKAVzAFkCA7AmZLABWTAAcDWBiAQQGUASgBUhfAPoCAojxwBNANoAGALqJQbVLDwY8qGmpAAPRACYAzIqwBOAKwWrVxYpsAWAGwBGFwHYANCABPRA9vFywnJw8rM1cADhcbAF9E-zRMXEIScipaejBGATACCACsAAlUAHcAYVoASTKwIjYuPiZpAGkxaoB5SiYAGUkhSSVVJBANLR09A2MEE28bazsTBI8zDxNoj38ghCiHLDWrWLdbRW2XGOTU9Gx8YlIKajoGLELi0p5YAGsuKS9ADiADk6nxJDgxgYptpdPoJvM3GY3FgXFY1t5FJ4sW53HtglY3CYsN4id4Ys4bF5FGZbiA0g9Ms8cm98h8iiUsNUyjwhFwIHowFg8DQAG6oX7CxkZJ7ZV55Aqc0o8vkIUUSgDGBBmNDG0ImsN1c0QRI8aIxNmcbjcZw2BIORLC2zcSzMmNxLnpMseWReuXeny5hTYRACrXaPC6vX6QxGBvUmjhs0RwUW3iwZhRJhstliJkWDsOVmO6LOFyuNxSDPusr9rMVHK+uDAGAIeCIsABkmBYIhUJUMKTxtTByWJNibsuLg8inHDrzxwpCSsM7MGMUVm9td9LIVgeVLbbHa7gJ6oPBkPkHnGiem8JNY5sE6na1n88CwWxZlJy4pVuiW03G3dJd3lAN2SDUocFbdtO27XtLyhExb0mYcH1HEJnywSc7Gnd9nyLDxziXMx1jnLMbFiOlqx9ZlwLZJVmxg494LPC9+3kMxUKNDDQHmLCXzwt850Iz8DkWMJvGXdxHAsaSQKZOV-UYpsuRYuDTx7c8+yvFwePQlN+OCcccNfGdRJMIszFiSxFjItZ3FxPFFLrPcIKY9TYJPBCdKQ+QbAM+8jKMEzsNwiwRI-fYvFiZZpLIy5aVnGxc1csCVMbKCj003yOKvNwguTBFjKfITIos6Lglzc17LMMlcytBIaLuUD6Myg9mO8tjtPyqFvCKkdSsEszhMqsSYvOVEEpibwPFzWkfHS9qG06rzWK0xDONiQa+NCsrRoqgirPEjxbJJOq5pzFwXFiM7luU1bIMPDSfPY3SoSsXaQoE0yIvwyyi0cDMZq2ExJ0UDZgNoncVv3Z6uo2vKPuvQdDUMkr9pG-6oom0xIZ-ezwdOaknBams2se+HPOg7rNr8ziPBvIdgsx37wvM46HTikkEp8RYQmxbwHvram1NKOgAFswAjTpuj6QZhlGNG72Kx8CyZ8JNlS4ibQse1xNOWqrUuVcmvBpIYcp0WPPFrAtAALxlto5ZjRX4xVtDWfVkxNeSnWbWRAmi0UM5SRN65XCo7xodapSbdU7KyBoPAAEcKDEAAzIoMDIVguxdqN5djJWEy9tXRw181-epQP9bMIiMWOE313q1LV2Fq34-cxPDwgPBYDbGhNWdyNowVuNle+tnTF96vtdrvXg9O7YQZN4jojzG6RZ7rLDzyWWi7dyey94n7Z79hfdaDg2YpcWlSwcM3aRsClYh3hi9+bZBijwMgC7HsXd2U8WYV1KlXLW81F43wbqdK0sRSToisN4EwQsbDIhMB-DqCMuQACNkB4CgAACwwDQOAADXYT1Lp7M+M8Fhz0gQHJet9gieGdEg9EyIoGLCwU9Gm9s8CSw7JwMQqBcEACswCagwIfceJcPbTx9pfKB1965FjmiWUIDgBa2FcJgrublP5rVKJqVAktaGyKASfGhGMlHzxUXXZeMV8zLBOKuLYjhTjIN4WLbKaAiCj0ofIkB6NvaVwYTXVRTjCQWEQacBIZJUHInJnRKmttsqwFQEQERbAiFgBoGY-JBBLHH2oYo8JyimEwIdKglEj9YhOjOkSOKPj0mHlFBgfIcAdA0CgFnAg0iSlUIUaAoa+0IGRMcSwhAuFw5k2zHOTc78DEZT4XbaoehM54GQJLIZwTT62MrsSc0r9vyzhMMSGcRYrSuPOMReat0X4pNhmk3uzYNk0C2TssQJhkb+RsWE8BpwSSziJPVd07o3CuCLC4RYaIYh2muNJOarS3lcg+V8yWPy-mM3KUC-MWBQXIgpOYC50K4FRCwNSKwIQ3BzhutsfRcdDHYP4QEOAYhaCwEqPkPZwCDmAv2hYVKxxkHOHMGdfMzgHQkvCBEMlKDTjIlRV-LkBTOU0G5bywucj+UArAUK26yxqLEkUD4GcrpkTXMpdS2l9LYUYhVcYsQQJ8iS1oCKCAATWgAHU6hCB5GIIQPQXWSAEJQHgIIBUGvmBcywth7COGcO4LwfhxJkRLBES4xFV5kRjk6nBAQXVuo9UCMNEaQR8usXi-aeISQYlsLaW6eI7oOgzXKpwvtiTILzbHCm2AgQAFU6jMDyAMVAxRIBcGqAMOo1QOjRrGbG5BOFXRnVzDmLEZw037ALOiept14j5nRM89IQ6R11DoNIvAYoZb8GEKICQ0g5CLr2rG6iWBXTINQaJa4mwamv00bSSGlxqQ3Mtsy89WAeDXtvVgOoXqZYiHEHwIQPBhBXn1UuxAmwJxIqJNsO6a4XBts3PFM4N0fD-hCF6AxUGYM6Dgwh7196xCofQyMAcNb5i4Zwvh7tRGNgkfEtsRwxwKOulQbYRYEH+1YHo7B4UfA2BFF+KKKAVaymjLfThrYfH6oEaNsR0jCRxPEvJFicwtHIPDug4prAAwB6dJTr0nFmHuM4bsBaAstJ6pmvBTUzepIKPZo2ItS21YCkQDgAYRk2nz4IAALSwodIltYBbkDxboW4B0yIqVZotVEVKzgMvMFYBwVgWXHwoOtR2pw1FzA0shqVqCVXRznFyzdfLna3yzlwy1w8FQaj1EaM0Nrw0QhAxjvUmOFIEreGWcy1ZvjDw-F+ON-aVGqXrkI3EW0KCd2EmmycScrp6pzcW3J5bbT3m8iEBt+YZIMwOrFSarMWwpuohO7N879VLupITqq0oIYwwPeCEzBBNlcP32ajcz7M2zvzf+y8wHxiconjBwcHwCCMRdv21Di58PvuI4uwN5sUswCY9qRmFEs1kHSUcodhAi4cyRHiFEE9faAe7zR47SnoSY343qpmZEgHkWM5DnlpYZMcxeHcWTrkyc04Z2zjqPOMWBfYYWMlTM2ZswUj1kREirOzU2j67EC3CvSj90HrQEeVPaQ09F09hnN0mdbFCHM-CoQ-unu7kYwtWA8gO+F7TsXrufDWVss3CIIQoe2iZVduGN2uQ-37v-EPTu6fi7dzCuKcTkHREuLNLnKOeeB-wYQkhZDYDwE1zp7Xofnf05QbnuBNLH6NrOMiJaKzk9otKFoIR2TkCiIkVIjAmeRfZ4j+7qaBeyLXF81Cq3WBTHmMOarLX1Pp-h9b5H0651O9MwcNcHMW4++vKB1gfx-Ot8N532Hl3+-3fAziRb3R1F5p+5ZWsjJWSck8kClpY6AHc4UW1lxGU1gYgakCZ6k10CwLBe8lt+9r8OkulB51N+lpEQ8SRLU5wGcLliQbBuZsJpczVQ5UorR1xV8MVtlJYqd3A8CaNbBbpohfZYg88Lo7l3RZd6p5paDNl6Cfkqd8wfx5ooUocQhbIUQuDjhzhUE7AvBwYKRV92VYANUtVMt68Et3R0EcJ8xbAzRaRqJYEYp1xq4og90QMCMf9rsB8sB1UuUeVtD79dCcxUQLdthcxPATCswYUiQqUrDIZX50RnwPArdi0dlaBMdyVd0bJutLg3xohX5UpIjXVoiaBPUAlMdzk20Lk6syU7pcNS9rZy8aYoj3Usiy1w1I1MdbofxkEoVYVXBW5nxhN9hIVCioViithSj-dWVxZKiPU1tMd4gwgwM4h4gyNVw2190TZLhPAzQbRvE6Nh0qddgRN7lSQLlYUislhWDXIoMmAx0J1osIBMcasRMThjhdiLkT9itZMZQoNL0BlGM79y4tdJwAN9DLNTgyNboZxO4bMR0GMb0PjaFHwOsRN4hXFkpTcbobQeE1jQT7NmMITN8sZJsRN3FrAURrgaVATqIjjbMwS4NlNVN1NYivA0RV4X4GksR1xSMEjalQ5iVsQKISTUT3iHMnN8kqSdC6FqQwgHVGSqIxUmScT3RSR4SLdsRPBllkggA */
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
            initial: "HowCanIHelp",
            states: {
              HowCanIHelp: {
                entry: say("Hi! How can I help you today?"),
                on: { SPEAK_COMPLETE: "Ask" },
              },

              Ask: {
                entry: listen(),
                on: {
                  RECOGNISED: 
                  {
                    target: "CHAT",
                    actions: [
                      ({ event }) => console.log(event),
                      assign({
                        lastResult: ({ event }) => event.value,
                      }),
                    ],
                  },
                },
              },
              CHAT: {
                invoke: {
                  src: fromPromise(async({ input })=> {
                    const data = await fetchFromChatGPT(input.lastResult[0].utterance + "I need it in the json format with the following entities: name_JSON, size_JSON, distance_JSON, age_JSON, radius_JSON, brightness_JSON, similar_object_JSON, composition_JSON, role_JSON, solar_phenomena_JSON, unique_features_JSON, interesing_fact_JSON", 200);
                    return data;
                  }),
                  input: ({ context, event}) => ({
                    lastResult: context.lastResult,
                  }),
                  onDone: {
                    target: "Reply",
                    actions: [
                      ({ event }) => console.log(JSON.parse(event.output)),
                      assign({ 
                        name_JSON: ({ event }) => JSON.parse(event.output).name_JSON,
                        size_JSON: ({ event }) => JSON.parse(event.output).size_JSON,
                        distance_JSON: ({ event }) => JSON.parse(event.output).distance_JSON,
                        age_JSON: ({ event }) => JSON.parse(event.output).age_JSON,
                        radius_JSON: ({ event }) => JSON.parse(event.output).radius_JSON,
                        brightness_JSON: ({ event }) => JSON.parse(event.output).brightness_JSON,
                        similar_object_JSON: ({ event }) => JSON.parse(event.output).similar_object_JSON,
                        composition_JSON: ({ event }) => JSON.parse(event.output).composition_JSON,
                        role_JSON: ({ event }) => JSON.parse(event.output).role_JSON,
                        solar_phenomena_JSON: ({ event }) => JSON.parse(event.output).solar_phenomena_JSON,
                        unique_features_JSON: ({ event }) => JSON.parse(event.output).unique_features_JSON,
                        interesing_fact_JSON: ({ event }) => JSON.parse(event.output).interesting_fact_JSON,
                      })
                    ],
                  },
                },
              },

              Reply:{
                entry: ({ context}) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Okay, I have gathered all the information I could find about ${context.name_JSON}. What would you like to know?` },
                  });
                },
                on: { SPEAK_COMPLETE: "Details"}
              },

              Details: {
                entry: listen(),
                on: {
                  RECOGNISED: [
                    {
                      target: "name",
                      guard: ({ event}) => !!ToLowerCase(event.value[0].utterance, "name_JSON"),
                      actions: assign ({
                        name: ({ event }) => ToLowerCase(event.value[0].utterance, "name_JSON"),
                      }),
                    },
                    {
                      target: "size",
                      guard: ({ event}) => !!ToLowerCase(event.value[0].utterance, "size_JSON"),
                      actions: assign ({
                        size: ({ event }) => ToLowerCase(event.value[0].utterance, "size_JSON"),
                      }),
                    },
                    {
                      target: "unique_features",
                      guard: ({ event}) => ToLowerCase(event.value[0].utterance, "unique_features_JSON"),
                      actions: assign ({
                        unique_features: ({ event }) => ToLowerCase(event.value[0].utterance, "unique_features_JSON"),
                      }),
                    },
                    {
                      target: "distance",
                      guard: ({ event}) => ToLowerCase(event.value[0].utterance, "distance_JSON"),
                      actions: assign ({
                        distance: ({ event }) => ToLowerCase(event.value[0].utterance, "distance_JSON"),
                      }),
                    },
                    {
                      target: "age",
                      guard: ({ event}) => ToLowerCase(event.value[0].utterance, "age_JSON"),
                      actions: assign ({
                        age: ({ event }) => ToLowerCase(event.value[0].utterance, "age_JSON"),
                      }),
                    },
                    {
                      target: "radius",
                      guard: ({ event}) => ToLowerCase(event.value[0].utterance, "radius_JSON"),
                      actions: assign ({
                        radius: ({ event }) => ToLowerCase(event.value[0].utterance, "radius_JSON"),
                      }),
                    },
                    {
                      target: "brightness",
                      guard: ({ event}) => ToLowerCase(event.value[0].utterance, "brightness_JSON"),
                      actions: assign ({
                        brightness: ({ event }) => ToLowerCase(event.value[0].utterance, "brightness_JSON"),
                      }),
                    },
                    {
                      target: "similar_object",
                      guard: ({ event}) => ToLowerCase(event.value[0].utterance, "similar_object_JSON"),
                      actions: assign ({
                        similar_object: ({ event }) => ToLowerCase(event.value[0].utterance, "similar_object_JSON"),
                      }),
                    },
                    {
                      target: "composition",
                      guard: ({ event}) => ToLowerCase(event.value[0].utterance, "composition_JSON"),
                      actions: assign ({
                        composition: ({ event }) => ToLowerCase(event.value[0].utterance, "composition_JSON"),
                      }),
                    },
                    {
                      target: "role",
                      guard: ({ event}) => ToLowerCase(event.value[0].utterance, "role_JSON"),
                      actions: assign ({
                        role: ({ event }) => ToLowerCase(event.value[0].utterance, "role_JSON"),
                      }),
                    },
                    {
                      target: "solar_phenomena",
                      guard: ({ event}) => ToLowerCase(event.value[0].utterance, "solar_phenomena_JSON"),
                      actions: assign ({
                        solar_phenomena: ({ event }) => ToLowerCase(event.value[0].utterance, "solar_phenomena_JSON"),
                      }),
                    },
                    {
                      target: "interesting_fact",
                      guard: ({ event}) => ToLowerCase(event.value[0].utterance, "interesting_fact_JSON"),
                      actions: assign ({
                        interesting_fact: ({ event }) => ToLowerCase(event.value[0].utterance, "interesting_fact_JSON"),
                      }),
                    },
                  ],
                },
              },

              name: {
                entry: ({ context}) => { context.spstRef.send({ type: "SPEAK", value:{ utterance: `${context.name} ${context.name_JSON}`}}); },
                on: { SPEAK_COMPLETE: "Confirm" },
              },

              size: {
                entry: ({ context}) => { context.spstRef.send({ type: "SPEAK", value:{ utterance: `${context.size} ${context.size_JSON}`}}); },
                on: { SPEAK_COMPLETE: "Confirm" },
              },

              unique_features: {
                entry: ({ context}) => { context.spstRef.send({ type: "SPEAK", value:{ utterance: `${context.unique_features} ${context.unique_features_JSON}`}}); },
                on: { SPEAK_COMPLETE: "Confirm" },
              },

              distance:{
                entry: ({ context}) => { context.spstRef.send({ type: "SPEAK", value:{ utterance: `${context.distance} ${context.distance_JSON}`}}); },
                on: { SPEAK_COMPLETE: "Confirm" },
              },

              age: {
                entry: ({ context}) => { context.spstRef.send({ type: "SPEAK", value:{ utterance: `${context.age} ${context.age_JSON}`}}); },
                on: { SPEAK_COMPLETE: "Confirm" },
              },

              radius: {
                entry: ({ context}) => { context.spstRef.send({ type: "SPEAK", value:{ utterance: `${context.radius} ${context.radius_JSON}`}}); },
                on: { SPEAK_COMPLETE: "Confirm" },
              },

              brightness: {
                entry: ({ context}) => { context.spstRef.send({ type: "SPEAK", value:{ utterance: `${context.brightness} ${context.brightness_JSON}`}}); },
                on: { SPEAK_COMPLETE: "Confirm" },
              },

              similar_object: {
                entry: ({ context}) => { context.spstRef.send({ type: "SPEAK", value:{ utterance: `${context.similar_object} ${context.similar_object_JSON}`}}); },
                on: { SPEAK_COMPLETE: "Confirm" },
              },

              composition: {
                entry: ({ context}) => { context.spstRef.send({ type: "SPEAK", value:{ utterance: `${context.composition} ${context.composition_JSON}`}}); },
                on: { SPEAK_COMPLETE: "Confirm" },
              },

              role: {
                entry: ({ context}) => { context.spstRef.send({ type: "SPEAK", value:{ utterance: `${context.role} ${context.role_JSON}`}}); },
                on: { SPEAK_COMPLETE: "Confirm" },
              },

              solar_phenomena: {
                entry: ({ context}) => { context.spstRef.send({ type: "SPEAK", value:{ utterance: `${context.solar_phenomena} ${context.solar_phenomena_JSON}`}}); },
                on: { SPEAK_COMPLETE: "Confirm" },
              },

              interesting_fact: {
                entry: ({ context}) => { context.spstRef.send({ type: "SPEAK", value:{ utterance: `${context.interesting_fact} ${context.interesting_fact_JSON}`}}); },
                on: { SPEAK_COMPLETE: "Confirm" },
              },
              Confirm: {
                entry: ({ context}) =>{
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Is there anything else you would like to know about ${context.name_JSON}?`}
                  });
                },
                on: { SPEAK_COMPLETE: "Confirm_2" },
              },
              Confirm_2:{
                entry: listen(),
                on: {
                  RECOGNISED: [
                    {
                      target: "yes_answer",
                      guard: ({ event}) => ToLowerCase(event.value[0].utterance, "yes"),
                    },
                    {
                      target: "no_answer",
                      guard: ({ event}) => ToLowerCase(event.value[0].utterance, "no"),
                    },
                  ],
                },
              },
              yes_answer: {
                entry: ({ context}) =>{
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Great! I'd be happy to tell you more about ${context.name_JSON}. What else would you like to know?`},
                  });
                },
                on: { SPEAK_COMPLETE: "Details" },
              },
              no_answer: {
                entry: ({ context}) =>{
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `It was nice talking to you. Have a nice day!`},
                  });
                },
                on: { SPEAK_COMPLETE: "#root" },
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
