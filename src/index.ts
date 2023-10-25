import { createMachine, createActor, assign, fromPromise, raise } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: "51a782b6273c4bebb54d1e04b0e108e0",
};

const settings: Settings = {
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  locale: "en-GB",
  asrDefaultNoInputTimeout: 5000,
  ttsDefaultVoice: "en-GB-LibbyNeural",
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
  "that's not what i said": {
    entities: {
      what: "askAgain",
    },
  },
  "that's not what i asked for": {
    entities: {
      what: "askAgain",
    },
  },
  "no, i didn't say that": {
    entities: {
      what: "askAgain",
    },
  },
  "that's not what i told you": {
    entities: {
      what: "askAgain",
    },
  },
  "i don't want to read this book": {
    entities: {
      what: "otherBook",
      answer: "no",
      sentiment: "notHappy",
    },
  },
  "no i'm good": {
    entities: {
      answer: "no",
    },
  },
  "i think i have read that already": {
    entities: {
      sentiment: "notHappy"
    },
  },
  "ok this one's better": {
    entities: {
      sentiment: "happy",
    },
  },
  "can you tell me a bit more about the author?": {
    entities: {
      what: "author",
    },
  },
  "sounds interesting": {
    entities: {
      sentiment: "happy",
    },
  },
  "ok, i'll give it a try": {
    entities: {
      sentiment: "happy",
    },
  },
  "sounds interesting. can you tell me about the author as well?": {
    entities: {
      what: "author",
    },
  },
  "i would like to read that": {
    entities: {
      sentiment: "happy",
      what: "plot",
      answer: "yes"
    },
  },
  "i have read that already": {
    entities: {
      what: "otherAuthor"
    },
  },
  "no, i have read that already": {
    entities: {
      what: "otherAuthor"
    },
  },
  "you suggested that already": {
    entities: {
      what: "otherAuthor",
      answer: "no"
    },
  },
  "not this again": {
    entities: {
      what: "otherAuthor",
      answer: "no"
    },
  },
  "no, i want you to tell me if he's written anything else": {
    entities: {
      what: "otherBook",
      answer: "no"
    },
  },
  "is there anything else?": {
    entities: {
      what: "otherBook",
      answer: "no"
    },
  },
  "i think i've read this book before": {
    entities: {
      what: "otherAuthor",
      answer: "no"
    },
  },
  "give me something else": {
    entities: {
      what: "otherAuthor",
    },
  },
  "is there another book by this author?": {
    entities: {
      what: "otherBook",
    },
  },
  "i want something completely different": {
    entities: {
      what: "otherAuthor",
    },
  },
  "i don't want this author": {
    entities: {
      what: "otherAuthor",
    },
  },
  "you're always suggesting him": {
    entities: {
      what: "otherAuthor",
    },
  },
  "that's not the author I asked for": {
    entities: {
      what: "askAgain",
    },
  },
  "what other books has this author written?": {
    entities: {
      what: "otherBook",
    },
  },
  "have they written anything else?": {
    entities: {
      what: "otherBook",
    },
  },
  "what other books have they written?": {
    entities: {
      what: "otherBook",
      answer: "no"
    },
  },
  "what other books has he written?": {
    entities: {
      what: "otherBook",
    },
  },
  "what other books has she written?": {
    entities: {
      what: "otherBook",
      answer: "no"
    },
  },
  "i have already read that": {
    entities: {
      what: "otherAuthor",
      answer: "no"
    },
  },
  "actually, i'd like something else": {
    entities: {
      what: "otherAuthor",
      answer: "no"
    },
  },
  "no, i want to read something else": {
    entities: {
      what: "otherAuthor",
      answer: "no"
    },
  },
  "no, i have already read that": {
    entities: {
      what: "otherAuthor",
      answer: "no"
    },
  },
  "no, i already know it": {
    entities: {
      answer: "no"
    },
  },
  "do you have something else?": {
    entities: {
      what: "otherAuthor",
    },
  },
  "i have already read this book": {
    entities: {
      what: "otherAuthor",
    },
  },
  "i don't like this book": {
    entities: {
      sentiment: "notHappy"
    },
  },
  "i don't really like this book": {
    entities: {
      sentiment: "notHappy",
    },
  },
  "none of these": {
    entities: {
      what: "otherAuthor",
      answer: "no"
    },
  },
  "i don't like this either": {
    entities: {
      sentiment: "notHappy",
      answer: "no"
    },
  },
  "i don't really like this either": {
    entities: {
      sentiment: "notHappy",
      answer: "no"
    },
  },
  "i don't like this book actually": {
    entities: {
      sentiment: "notHappy",
      answer: "no"
    },
  },
  "i don't know": {
    entities: {
      sentiment: "notHappy",
      answer: "no"
    },
  },
  "any other options?": {
    entities: {
      what: "otherAuthor",
    },
  },
  "is there something similar?": {
    entities: {
      what: "otherAuthor",
    },
  },
  "can you suggest me something similar?": {
    entities: {
      what: "otherAuthor",
    },
  },
  "i have already read that, but is there something similar?": {
    entities: {
      what: "otherAuthor",
    },
  },
  "i don't like this author": {
    entities: {
      what: "otherAuthor",
      answer: "no"
    },
  },
  "i love this author": {
    entities: {
      what: "author"
    },
  },
  "can you tell me more about the author?": {
    entities: {
      what: "author"
    },
  },
  "i would like to know about the author": {
    entities: {
      what: "author"
    },
  },
  "i have never read anything by this author": {
    entities: {
      what: "author"
    },
  },
  "i haven't heard of this author before": {
    entities: {
      what: "author"
    },
  },
  "i don't want to know about these things": {
    entities: {
      answer: "no"
    },
  },
  "no": {
    entities: {
      answer: "no",
    },
  },
  "no, thank you": {
    entities: {
      answer: "no",
    },
  },
  "i don't want to": {
    entities: {
      answer: "no",
    },
  },
  "i don't": {
    entities: {
      answer: "no",
    },
  },
  "no i don't": {
    entities: {
      answer: "no",
    },
  },
  "tell me about the plot": {
    entities: {
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
  "no i already know that": {
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
    },
  },
  "sure": {
    entities: {
      answer: "yes",
    },
  },
  "yes please": {
    entities: {
      answer: "yes",
    },
  },
  "yeah sure": {
    entities: {
      answer: "yes",
    },
  },
  "yes": {
    entities: {
      answer: "yes",
    },
  },
  "yes, please": {
    entities: {
      answer: "yes",
    },
  },
  "yeah tell me about the plot": {
    entities: {
      answer: "yes",
      what: "plot"
    },
  },
  "yes, tell me about its plot": {
    entities: {
      answer: "yes",
      what: "plot"
    },
  },
  "tell me about its plot": {
    entities: {
      answer: "yes",
      what: "plot"
    },
  },
  "what is it about?": {
    entities: {
      what: "plot"
    },
  },
  "can you tell me what it is about?": {
    entities: {
      what: "plot"
    },
  },
  "what happens in this book?": {
    entities: {
      what: "plot"
    },
  },
  "i've never heard about this book": {
    entities: {
      what: "plot"
    },
  },
  "ok i would like to read this book": {
    entities: {
      sentiment: "happy"
    }
  },
  "ok, i'd like to read this book": {
    entities: {
      sentiment: "happy"
    }
  },
  "i would like to read this book": {
    entities: {
      sentiment: "happy"
    }
  },
  "yeah i like this book": {
    entities: {
      sentiment: "happy",
    },
  },
  "nice": {
    entities: {
      sentiment: "happy",
    },
  },
  "seems interesting": {
    entities: {
      what: "plot",
      answer: "yes"
    },
  },
  "tell me more": {
    entities: {
      what: "plot",
      answer: "yes"
    },
  },
  "yes, tell me about its plot please": {
    entities: {
      answer: "yes",
      what: "plot"
    }
  },
};

export function displayTitles(bookNames: any) {
  const elem = document.getElementById("image");
    if (elem) {
      elem.innerHTML = '';
    }
    const container = document.getElementById("container");
    container.innerHTML = '';
    if (container) {
      for (let i = 0; i < bookNames.length; i++) {
        const bookDiv = document.createElement("div");
        console.log("Element created");
        bookDiv.textContent = bookNames[i];
        bookDiv.className = "book-image";
        container.appendChild(bookDiv);
        console.log(bookNames[i])
        const title = bookNames[i]
        bookDiv.onclick = () => raise(({ context, event }) => ({ type: 'SELECTED', id: "book", name: bookNames[i] }));
      }
    }
}

export function getBookCover(isbn: any, size: any) {
    const elem = document.getElementById("image");
    const container = document.getElementById("container");
    container.innerHTML = '';
    if (elem) {
      elem.innerHTML = '';
      const img = elem.innerHTML = `<img src="https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg" />`;
      return img
    }
  }

const lower = (sentence: string) => {
  let u = sentence.toLowerCase().replace(/\.$/g, "");
  return u
}

// this function would have been more accurate implemented with ngrams
const findWhichBook = (sent: any, otherBooks: any) => {
  const lowerSent = lower(sent);
  const sentWords = lowerSent.split(" ");
  console.log('sent words', sentWords)
  for (const book of otherBooks) {
    const lowerBook = lower(book);
    const bookWords = lowerBook.split(" ");
    console.log('book words', bookWords)
    for (const word of bookWords) {
      if (sentWords.includes(word)) {
        return true;
      }
    }
  }
  return false;
}

export function extractWord(sent: any, word: any, secondWord?: any) {
  const lowercasedSentence = lower(sent);
  const words = lowercasedSentence.split(' ');
  if (words.includes(word)) {
    return true
  } else {
    return false
  }
}

// machine
const dmMachine = createMachine(
  {
    id: "root",
    type: "parallel",
    states: {
      Clicked: {
        initial: "bookInfo",
        states: {
          bookInfo: {
            on: {
              SELECTED: [
                {
                  target: "#root.DialogueManager.Ready.chatGPT",
                  guard: ({ context, event }) => event.id === "book",
                  actions: assign({
                    book: ({ event }) => event.name,
                    prompt: ({ context, event }) => `the book I want to read now is ${context.book}. Give me a json format with the entities bookName, bookAuthor, bookGenre, bookMood, bookISBN, bookPlot, and authorInfo.`,
                  }),
                },
                {
                  target: "openInfoPage",
                  guard: ({ context, event }) => event.id === "image",
                },
              ],
            },
          },
          openInfoPage: {
            entry: ({ context }) => {
              window.open(`https://openlibrary.org/isbn/${context.bookISBN}`);
            },
          }
        }
      },
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
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: "What are you in the mood for reading today?" },
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
                          lastResult: ({ event }) => event.value,
                          messages: ({ context, event }) => ["What are you in the mood for reading today?"],
                          prompt: ({ context }) => `the last utterance contains what I seek to read. 
                          Give me your suggestion of one book in a JSON file with entities like bookName, bookAuthor, bookGenre, bookMood, bookISBN, bookPlot, and authorInfo. The entity values can also be a list, but don't nest. bookISBN needs to be accurate and corresponding to the book you're giving
                          Be diverse/unpredictable and give the JSON file straight away, don't answer if the utterance is a question`,
                          time: ({ context }) => 1,
                        }),
                      ],
                    }],
                },
              },
              chatGPT: {
                entry: "filler.pause",
                invoke: {
                  src: fromPromise(async ({ input }) => {
                    const userInput = input.lastResult[0].utterance;
                    input.messages.push(userInput);
                    const gptAnswer = await fetchFromChatGPT(`${input.messages}. ${input.prompt}`, 250);
                    return gptAnswer;
                  }),
                  input: ({ context, event }) => ({
                    lastResult: context.lastResult,
                    messages: context.messages,
                    prompt: context.prompt
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
                        bookISBN: ({ event }) => JSON.parse(event.output).bookISBN,
                        bookPlot: ({ event }) => JSON.parse(event.output).bookPlot,
                        authorInfo: ({ event }) => JSON.parse(event.output).authorInfo,
                        otherBooks: ({ event }) => JSON.parse(event.output).otherBooks,
                        secondTimeInState: ({ event }) => JSON.parse(event.output).secondTimeInState,
                        thirdTimeInState: ({ event }) => JSON.parse(event.output).thirdTimeInState,
                        timesInState: ({ event }) => JSON.parse(event.output).timesInState,
                        messages: ({ context }) => context.messages
                      }),
                    ]
                  },
                },
              },
              success: {
                entry: ({ context }) => {
                  let assistantMessage = `ok let's see!`
                  console.log("times in state", context.bookAuthor, "second", context.secondTimeInState, "third", context.thirdTimeInState)
                  context.messages.push(assistantMessage)
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `${assistantMessage}` },
                  });
                },
                // invoke: {
                //   src: fromPromise(async ({ input }) => {
                //     const title = input.bookName;
                //     const data = await getBooks(title, input.author);
                //     return data;
                //   }),
                //   input: ({ context, event}) => ({
                //     bookName: context.bookName,
                //     author: context.bookAuthor
                //   }),
                //   onDone: {
                //     actions: [
                //       ({ event }) => event.output,
                //       assign({
                //         bookPageCount: ({ context, event }) => event.output.items[0].volumeInfo.pageCount,
                //         previewLink: ({  })
                //       }),
                //       ({ context }) => console.log("isbn from api: ", context.bookISBN),
                //     ],
                //   },
                // },
                on: {
                  SPEAK_COMPLETE: [{
                    target: "suggestion",
                    guard: ({ context, event }) => {
                      if (context.time === 1) {
                        return true
                      }
                      return false
                    },
                    actions: [assign({
                      lastResult: ({ context, event }) => event.value,
                    })]
                  },
                  {
                    target: "booksByAuthor",
                    guard: ({ context, event }) => {
                      if (context.secondTimeInState === "second") {
                        return true
                      }
                      return false
                    },
                    actions: [assign({
                      lastResult: ({ context, event }) => event.value,
                    })]
                  },
                  {
                    target: "otherSuggestion",
                    guard: ({ context, event }) => {
                      if (context.thirdTimeInState === "third") {
                        return true
                      }
                      return false
                    },
                    actions: [assign({
                      lastResult: ({ context, event }) => event.value,
                    })]
                  },
                  {
                    target: "whichBookFound",
                    guard: ({ context, event }) => {
                      if (context.timesInState === "four") {
                        return true
                      }
                      return false
                    },
                    actions: [assign({
                      lastResult: ({ context, event }) => event.value,
                    })]
                  },]
                }
              },
              suggestion: {
                entry: ({ context }) => {
                  let assistantMessage = `How about ${context.bookName} by ${context.bookAuthor}? Personally, I find it to be a quite ${context.bookMood}, ${context.bookGenre} book!`
                  let bookCover = getBookCover(context.bookISBN, 'L')
                  bookCover
                  context.messages.push(assistantMessage)
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `${assistantMessage}` },
                  });
                },
                on: { SPEAK_COMPLETE: "yesNo" }
              },
              booksByAuthor: {
                entry: ({ context }) => {
                  let titles = displayTitles(context.otherBooks)
                  titles
                  let assistantMessage = `These are a couple of the other books ${context.bookAuthor} has written. ${context.otherBooks}. Which one would you like to read?`
                  context.messages.push(assistantMessage)
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `${assistantMessage}` },
                  });
                },
                on: { SPEAK_COMPLETE: "whichBook" }
              },
              otherSuggestion: {
                entry: ({ context }) => {
                  let bookCover = getBookCover(context.bookISBN, 'L')
                  bookCover
                  let assistantMessage = `I found an even better one now! It's ${context.bookName} by ${context.bookAuthor}. It seems to be a rather ${context.bookMood}, ${context.bookGenre} book!`
                  context.messages.push(assistantMessage)
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `${assistantMessage}` },
                  });
                },
                on: { SPEAK_COMPLETE: "yesNo" }
              },
              whichBookFound: {
                entry: ({ context }) => {
                  let assistantMessage = `Here is ${context.bookName} by ${context.bookAuthor}. Looks like a pretty ${context.bookMood}, ${context.bookGenre} book!`
                  let bookCover = getBookCover(context.bookISBN, 'L')
                  bookCover
                  context.messages.push(assistantMessage)
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `${assistantMessage}` },
                  });
                },
                on: { SPEAK_COMPLETE: "yesNo" }
              },
              yesNo: {
                initial: 'AskAgain',
                states: {
                  AskAgain: {
                    entry: listen(),
                    after: {
                      6000: {
                        target: 'prompt',
                      },
                    },
                    on: {
                      RECOGNISED: [
                        {
                          target: "#root.DialogueManager.Ready.misunderstood",
                          guard: ({ context, event }) => {
                            const sent = lower(event.value[0].utterance);
                            if (sent in grammar) {
                              if (grammar[sent].entities.what == "askAgain") {
                                return true
                              }
                            }
                            return false
                          },
                          actions: [assign({
                            lastResult: ({ context, event }) => event.value,
                          })]
                        },
                        {
                          target: "#root.DialogueManager.Ready.chatGPT",
                          guard: ({ context, event }) => {
                            const sent = lower(event.value[0].utterance);
                            if (sent in grammar) {
                              if (grammar[sent].entities.what == "otherBook" || extractWord(sent, "written", "else")) {
                                context.prompt = `Please provide a JSON response that includes a list of only 3 books (entities: otherBooks) written by ${context.bookAuthor} (entities: bookAuthor) but exclude ${context.bookName}. Additionally, include the entity 'secondTimeInState' with the value 'second.' For the 'bookISBN' entity, I want a list of valid ISBNs corresponding to the books in the 'otherBooks' list. Please make sure to format this list without nesting. In case multiple ISBNs are found, place them in a single list`
                                return true
                              }
                              else if (grammar[sent].entities.what == "otherAuthor" || extractWord(sent, "something", "similar") || extractWord(sent, "similar")) {
                                context.prompt = `I have already read ${context.bookName} by ${context.bookAuthor} or you suggested it too many times or I don't like the author. 
                            Give me only one different one. Give the answer in a JSON format with the entities bookName, bookMood, bookGenre, bookAuthor, bookPlot, authorInfo, and bookISBN.
                            Also an entity thirdTimeInState with the value "third"`
                                return true
                              }
                            }
                            return false
                          },
                          actions: [assign({
                            lastResult: ({ context, event }) => event.value,
                            time: ({ context }) => 0
                          })]
                        },
                        {
                          target: "#root.DialogueManager.Ready.plot",
                          guard: ({ context, event }) => {
                            const sent = lower(event.value[0].utterance);
                            if (sent in grammar) {
                              if (grammar[sent].entities.what == "plot") {
                                return true
                              }
                            }
                            return false
                          },
                          actions: [
                            ({ event }) => console.log(event.output),
                            assign({
                              lastResult: ({ context, event }) => event.value,
                            })
                          ]
                        },
                        {
                          target: 'author',
                          guard: ({ context, event }) => {
                            const sent = lower(event.value[0].utterance);
                            if (sent in grammar) {
                              if (grammar[sent].entities.what == "author") {
                                return true
                              }
                            }
                            return false
                          },
                        },
                        {
                          target: 'prompt',
                          guard: ({ context, event }) => {
                            const sent = lower(event.value[0].utterance);
                            if (sent in grammar) {
                              if (grammar[sent].entities.sentiment == "happy") {
                                return true
                              }
                            }
                            return false
                          },
                        },
                        {
                          target: 'sayBoth',
                          guard: ({ context, event }) => {
                            const sent = lower(event.value[0].utterance);
                            if (sent in grammar) {
                              if (grammar[sent].entities.answer == "yes") {
                                return true
                              }
                            }
                            return false
                          },
                        },
                        {
                          target: "#root.DialogueManager.Ready.plot.goodbyeOrDifferentBook.DifferentBook",
                          guard: ({ context, event }) => {
                            const sent = lower(event.value[0].utterance);
                            if (sent in grammar) {
                              if (grammar[sent].entities.answer == "no" || grammar[sent].entities.sentiment == "notHappy") {
                                return true
                              }
                            }
                            return false
                          },
                          actions: [
                            ({ event }) => console.log(event.output),
                            assign({
                              lastResult: ({ context, event }) => event.value,
                            })
                          ]
                        },
                        {
                          target: "#root.DialogueManager.Ready.noEntiendo",
                          actions: [
                            ({ event }) => console.log(event),
                            assign({
                              lastResult: ({ event }) => event.value,
                            }),
                          ],
                        },
                      ],
                    },
                  },
                  prompt: {
                    entry: ({ context }) => {
                      let assistantMessage = `Would you like to learn about the plot or the author?`
                      context.messages.push(assistantMessage)
                      context.spstRef.send({
                        type: "SPEAK",
                        value: { utterance: `${assistantMessage}` },
                      });
                    },
                    on: { SPEAK_COMPLETE: "AskAgain" }
                  },
                  sayBoth: {
                    entry: ({ context }) => {
                      let assistantMessage = `${context.bookPlot}. ${context.authorInfo}.`
                      context.messages.push(assistantMessage)
                      context.spstRef.send({
                        type: "SPEAK",
                        value: { utterance: `${assistantMessage}` },
                      });
                    },
                    on: { SPEAK_COMPLETE: "#root.DialogueManager.Ready.plot.goodbyeOrDifferentBook" }
                  },
                  author: {
                    entry: ({ context }) => {
                      let assistantMessage = `${context.authorInfo}.`
                      context.messages.push(assistantMessage)
                      context.spstRef.send({
                        type: "SPEAK",
                        value: { utterance: `${assistantMessage}` },
                      });
                    },
                    on: { SPEAK_COMPLETE: "#root.DialogueManager.Ready.plot.goodbyeOrDifferentBook" }
                  }
                },
              },
              whichBook: {
                entry: listen(),
                on: {
                  RECOGNISED: [
                    {
                      target: "#root.DialogueManager.Ready.plot.goodbyeOrDifferentBook.DifferentBook",
                      guard: ({ context, event }) => {
                        const sent = lower(event.value[0].utterance);
                        if (sent in grammar) {
                          if (grammar[sent].entities.what == "otherAuthor") {
                            return true
                          }
                        }
                        return false
                      },
                      actions: [assign({
                        lastResult: ({ context, event }) => event.value,
                      })]
                    },
                    {
                      target: "chatGPT",
                      guard: ({ context, event }) => {
                        const trueOrFalse = findWhichBook(event.value[0].utterance, context.otherBooks)
                        if (trueOrFalse === true) {
                          return true;
                        }
                        return false;
                      },
                      actions: [assign({
                        lastResult: ({ event }) => event.value,
                        prompt: ({ context }) => `Please, reply to the last input. Return your answer in a JSON format with the entities bookName, bookAuthor, bookGenre, bookMood, bookISBN, bookPlot, and authorInfo. Return an entity timesInState with the value "four"`,
                      }),
                      ({ context }) => console.log("in state")]
                    },
                  ],
                }
              },
              noEntiendo: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: "I don't think I got that correctly. Could you repeat it please?" },
                  });
                },
                on: { SPEAK_COMPLETE: "yesNo" },
              },
              misunderstood: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: "Oh I'm so sorry, I'm thinking about books all the time. What was it?" },
                  });
                },
                on: { SPEAK_COMPLETE: "Ask" },
              },
              plot: {
                initial: 'sayPlot',
                states: {
                  sayPlot: {
                    entry: ({ context }) => {
                      context.spstRef.send({
                        type: "SPEAK",
                        value: { utterance: `${context.bookPlot}.` },
                      });
                    },
                    on: { SPEAK_COMPLETE: "goodbyeOrDifferentBook" },
                  },
                  goodbyeOrDifferentBook: {
                    initial: 'happyOrNot',
                    states: {
                      happyOrNot: {
                        entry: listen(),
                        after: {
                          6000: {
                            target: 'prompt1',
                          },
                        },
                        on: {
                          RECOGNISED: [
                            {
                              target: "#root.DialogueManager.Ready.chatGPT",
                              guard: ({ context, event }) => {
                                const sent = lower(event.value[0].utterance);
                                if (sent in grammar) {
                                  if (grammar[sent].entities.what == "otherBook") {
                                    context.prompt = `"Please provide a JSON response that includes a list of only 3 books (entities: otherBooks) written by ${context.bookAuthor} (entities: bookAuthor) but exclude ${context.bookName}. Additionally, include the entity 'secondTimeInState' with the value 'second.' For the 'bookISBN' entity, I want a list of ISBNs corresponding to the books in the 'otherBooks' list. Please make sure to format this list without nesting. In case multiple ISBNs are found, place them in a single list`
                                    return true
                                  }
                                  else if (grammar[sent].entities.what == "otherAuthor") {
                                    context.prompt = `I have already read ${context.bookName} by ${context.bookAuthor} or you suggested it too many times or I don't like the author. 
                                Give me only one different one. Give the answer in a JSON format with the entities bookName, bookMood, bookGenre, bookAuthor, bookPlot, authorInfo, and bookISBN.
                                Also an entity thirdTimeInState with the value "third"`
                                    return true
                                  }
                                }
                                return false
                              },
                              actions: [assign({
                                lastResult: ({ context, event }) => event.value,
                                time: ({ context }) => 0
                              })]
                            },
                            {
                              target: "DifferentBook",
                              guard: ({ context, event }) => {
                                const sent = lower(event.value[0].utterance);
                                if (sent in grammar) {
                                  if (grammar[sent].entities.answer == "no" || grammar[sent].entities.sentiment == "notHappy") {
                                    return true;
                                  }
                                  return false;
                                }
                              },
                            },
                            {
                              target: "#root.DialogueManager.Ready.plot",
                              guard: ({ context, event }) => {
                                const sent = lower(event.value[0].utterance);
                                if (sent in grammar) {
                                  if (grammar[sent].entities.what == "plot") {
                                    return true;
                                  }
                                  return false;
                                };
                              }
                            },
                            {
                              target: "#root.DialogueManager.Ready.yesNo.author",
                              guard: ({ context, event }) => {
                                const sent = lower(event.value[0].utterance);
                                if (sent in grammar) {
                                  if (grammar[sent].entities.what == "author") {
                                    return true;
                                  }
                                  return false;
                                };
                              }
                            },
                            {
                              target: 'prompt1',
                              guard: ({ context, event }) => {
                                const sent = lower(event.value[0].utterance);
                                if (sent in grammar) {
                                  if (grammar[sent].entities.sentiment == "happy") {
                                    return true;
                                  }
                                  return false;
                                };
                              },
                            },
                            {
                              target: 'goodbye',
                              guard: ({ context, event }) => {
                                const sent = lower(event.value[0].utterance);
                                if (sent in grammar) {
                                  if (grammar[sent].entities.answer == "yes") {
                                    return true;
                                  }
                                  return false;
                                };
                              },
                            },
                            {
                              target: "noEntiendo",
                              actions: [
                                ({ event }) => console.log(event),
                                assign({
                                  lastResult: ({ event }) => event.value,
                                }),
                              ],
                            }]
                        }
                      },
                      noEntiendo: {
                        entry: ({ context }) => {
                          let differentBook = true
                          context.differentBook = differentBook
                          context.spstRef.send({
                            type: "SPEAK",
                            value: { utterance: "Sorry, I can't hear you very well. Are you happy with this book recommendation?" },
                          });
                        },
                        on: { SPEAK_COMPLETE: "happyOrNot" },
                      },
                      DifferentBook: {
                        entry: ({ context }) => {
                          let differentBook = true
                          context.differentBook = differentBook
                          context.spstRef.send({
                            type: "SPEAK",
                            value: { utterance: "Would you like me to suggest you a different book?" },
                          });
                        },
                        on: { SPEAK_COMPLETE: "yesOrNoBook" },
                      },
                      yesOrNoBook: {
                        entry: listen(),
                        on: {
                          RECOGNISED: [
                            {
                              target: "goodbye",
                              guard: ({ context, event }) => {
                                const sent = lower(event.value[0].utterance);
                                if (sent in grammar) {
                                  if (grammar[sent].entities.answer == "no" || extractWord(sent, "no")) {
                                    return true;
                                  }
                                  return false;
                                }
                              },
                            },
                            {
                              target: "prompt1",
                              guard: ({ context, event }) => {
                                const sent = lower(event.value[0].utterance);
                                if (sent in grammar) {
                                  if (grammar[sent].entities.sentiment == "happy") {
                                    return true;
                                  }
                                  return false;
                                }
                              },
                            },
                            {
                              target: '#root.DialogueManager.Ready.chatGPT',
                              guard: ({ context, event }) => {
                                const sent = lower(event.value[0].utterance);
                                if (extractWord(sent, "yes") == true || extractWord(sent, "similar") == true || extractWord(sent, "recommend")) {
                                  context.prompt = `This list of messages is the current conversation. Suggest me only one book, but exclude ${context.bookName} by ${context.bookAuthor}. 
                            Answer me in a JSON format with the entities bookName, bookMood, bookGenre, bookAuthor, bookPlot, authorInfo, and bookISBN.
                            Also an entity thirdTimeInState with the value "third"`
                                  return true;
                                }
                                return false;
                              },
                            },
                            {
                              target: 'notUnderstood',
                            }]
                        }
                      },
                      notUnderstood: {
                        entry: ({ context }) => {
                          let assistantMessage = `Sorry I didn't catch that. Would you like me to find another book for you?`
                          context.messages.push(assistantMessage)
                          context.spstRef.send({
                            type: "SPEAK",
                            value: { utterance: `${assistantMessage}` },
                          });
                        },
                        on: { SPEAK_COMPLETE: "yesOrNoBook" }
                      },
                      prompt1: {
                        entry: ({ context }) => {
                          let assistantMessage = `Are you happy with this book recommendation?`
                          context.messages.push(assistantMessage)
                          context.spstRef.send({
                            type: "SPEAK",
                            value: { utterance: `${assistantMessage}` },
                          });
                        },
                        on: { SPEAK_COMPLETE: "#root.DialogueManager.Ready.plot.goodbyeOrDifferentBook" }
                      },
                      goodbye: {
                        entry: ({ context }) => {
                          context.spstRef.send({
                            type: "SPEAK",
                            value: { utterance: `Hope this information makes you more excited about reading this book! If you're looking for more recommendations, feel free to ask! Happy reading!` },
                          });
                        },
                      },
                    },
                  },
                },
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
          value: { utterance: "Hello!" }, //I am here to help you find your next read! After that we can talk about the author, their books or I will help you find something similar." },
        });
      },
      "filler.pause": ({ context }) =>
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: 'Haah! Ok, let me check my book collection' },
        }),
      "speak.how-can-I-help": ({ context }) =>
        context.spstRef.send({
          type: "SPEAK",
          value: { utterance: "How can I help you?" },
        }),
      "gui.PageLoaded": ({ }) => {
        document.getElementById("button").innerText = "Click to start!";
      },
      "gui.Inactive": ({ }) => {
        document.getElementById("button").innerText = "Inactive";
      },
      "gui.Idle": ({ }) => {
        document.getElementById("button").innerText = "Idle";
      },
      "gui.Speaking": ({ }) => {
        document.getElementById("button").innerText = "Speaking...";
      },
      "gui.Listening": ({ }) => {
        document.getElementById("button").innerText = "Listening...";
      },
    },
  },
);

const actor = createActor(dmMachine).start();

document.getElementById("button").onclick = () => actor.send({ type: "CLICK" });
document.getElementById("image").onclick = () => actor.send({ type: "SELECTED", id: "image" });

actor.subscribe((state) => {
  console.log(state.value);
});

async function getBooks(titleText: any, author: any) {
  //const response = fetch(`http://openlibrary.org/search.json?q=${titleText}`)
  const response = fetch(`https://www.googleapis.com/books/v1/volumes?q=${titleText}+inauthor${author}&printType=books&langRestrict=english`)
    .then(response => response.json())
  // .then(response => {
  //   response.docs[0].isbn[0]
  // })
  console.log(response)//, response.)
  return response
};

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
    temperature: 1,
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

