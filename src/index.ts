import { createMachine, createActor, assign, raise, fromPromise } from "xstate";
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
  ttsDefaultVoice: "en-US-AmberNeural"
};

interface DMContext {
  spstRef?: any;
  lastResult?: Hypothesis[];
}

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
  entities: {
    [index: string]: string[];
  };
}

const choicesGrammar = {
  entities: {
    general: ["general", "basic"],
    characters: ["characters", "character"],
    staff: ["staff", "people"],
    episode: ["episodes", "episode"],
    similar: ["similar", "recommendations", "recommendation"],
    reviews: ["reviews", "review", "comment", "comments"],
    synopsis: ["synopsis", "plot", "plotline", "story"]
  }
}

const generalInformationGrammar = {
  entities: {
    date: ["date", "release", "released"],
    duration: ["duration", "long"],
    episodes: ["episodes"],
    genre: ["genre", "genres"],
    popularity: ["popularity", "popular"],
    ranking: ["ranking"],
    rating: ["rating"],
    score: ["score", "scored"],
    status: ["status", "finished", "airing", "ongoing"],
    type: ["type", "film", "movie", "series"]
  },
};

import axios from 'axios';

async function fetchRandomAnime() {
  const apiUrl = `https://api.jikan.moe/v4/random/anime`;
  try {
    const response = await axios.get(apiUrl);

    if (response.status === 200) {
      const animeDetails = response.data;
      if (animeDetails.data.genres.length > 0 && animeDetails.data.rating !== "R+ - Mild Nudity" && animeDetails.data.rating !== "Rx - Hentai") {
        return {
          anime: animeDetails,
          message: "true"
        }
      }
      else {
        return {
          message: "false"
        }
      }
    } else {
      console.error('Failed to fetch anime details.');
      return 'Failed to fetch anime details';
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.error('Anime not found.');
      return {
        message: "false"
      }
        ;
    } else {
      console.error('An error occurred while fetching anime details:', error);
      return {
        message: "false1"
      };
    }
  }
};

async function fetchAnimeCharacters(id: string) {
  const apiUrl = `https://api.jikan.moe/v4/anime/${id}/characters`;
  try {
    const response = await axios.get(apiUrl);

    if (response.status === 200) {
      const animeDetails = response.data;
      return {
        anime: animeDetails,
        message: "true"
      }
    }
    else {
      console.error('Failed to fetch anime details.');
      return 'Failed to fetch anime details';
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.error('Anime not found.');
      return {
        message: "false"
      }
        ;
    } else {
      console.error('An error occurred while fetching anime details:', error);
      return {
        message: "false1"
      };
    }
  }
};

async function fetchAnimeStaff(id: string) {
  const apiUrl = `https://api.jikan.moe/v4/anime/${id}/staff`;
  try {
    const response = await axios.get(apiUrl);

    if (response.status === 200) {
      const animeDetails = response.data;
      return {
        anime: animeDetails,
        message: "true"
      }
    }
    else {
      console.error('Failed to fetch anime details.');
      return 'Failed to fetch anime details';
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.error('Anime not found.');
      return {
        message: "false"
      }
        ;
    } else {
      console.error('An error occurred while fetching anime details:', error);
      return {
        message: "false1"
      };
    }
  }
};

async function fetchAnimeRecommendations(id: string) {
  const apiUrl = `https://api.jikan.moe/v4/anime/${id}/recommendations`;
  try {
    const response = await axios.get(apiUrl);

    if (response.status === 200) {
      const animeDetails = response.data;
      return {
        anime: animeDetails,
        message: "true"
      }
    }
    else {
      console.error('Failed to fetch anime details.');
      return 'Failed to fetch anime details';
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.error('Anime not found.');
      return {
        message: "false"
      }
        ;
    } else {
      console.error('An error occurred while fetching anime details:', error);
      return {
        message: "false1"
      };
    }
  }
};

async function fetchAnimeInformation(id: string) {
  const apiUrl = `https://api.jikan.moe/v4/anime/${id}`;
  try {
    const response = await axios.get(apiUrl);

    if (response.status === 200) {
      const animeDetails = response.data;
      return {
        anime: animeDetails,
        message: "true"
      }
    }
    else {
      console.error('Failed to fetch anime details.');
      return 'Failed to fetch anime details';
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.error('Anime not found.');
      return {
        message: "false"
      }
        ;
    } else {
      console.error('An error occurred while fetching anime details:', error);
      return {
        message: "false1"
      };
    }
  }
};

const dmMachine = createMachine(
  {
    id: "root",
    type: "parallel",
    states: {
      Random: {
        initial: "Prepare",
        states: {
          Prepare: {
            on: { ASRTTS_READY: "Prompt" },
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
          Prompt: {
            initial: "Greeting",
            states: {
              Greeting: {
                entry: "speak.greeting",
                on: { SPEAK_COMPLETE: "Jikan" },
              },
              Jikan: {
                invoke: {
                  src: fromPromise(async ({ }) => {
                    const data = await fetchRandomAnime();
                    return data;
                  }),
                  onDone: [{
                    target: "animeTitle",
                    guard: ({ event }) => event.output.message === "true",
                    actions: [
                      ({ event }) => console.log(event.output),
                      assign({
                        image: ({ event }) => event.output.anime.data.images.jpg.large_image_url,
                        title: ({ event }) => event.output.anime.data.title,
                        id: ({ event }) => event.output.anime.data.mal_id,
                        aired: ({ event }) => event.output.anime.data.aired.string,
                        duration: ({ event }) => event.output.anime.data.duration,
                        episodes: ({ event }) => event.output.anime.data.episodes,
                        genre: ({ event }) => event.output.anime.data.genres[0].name,
                        popularity: ({ event }) => event.output.anime.data.popularity,
                        rank: ({ event }) => event.output.anime.data.rank,
                        rating: ({ event }) => event.output.anime.data.rating,
                        score: ({ event }) => event.output.anime.data.score,
                        status: ({ event }) => event.output.anime.data.status,
                        type: ({ event }) => event.output.anime.data.type,
                      }),
                    ],
                  },
                  {
                    target: "Jikan",
                    guard: ({ event }) => event.output.message === "false",
                  },
                  {
                    target: "Refresh",
                    guard: ({ event }) => event.output.message === "false1"
                  },
                  ],
                },
              },
              animeTitle: {
                entry: ({ context }) => {
                  const animeTitle = context.title;
                  const animeImage = context.image;
                  const titleElement = document.getElementById("animeTitleElementId");
                  const imageElement = document.getElementById("animeImageElementId");
                  const buttonElement = document.getElementById("button");
                  const h1Element = document.getElementById("h1");
                  const h2Element = document.getElementById("h2");
                  const gifElement = document.getElementById("sailor");
                  const gif1Element = document.getElementById("point");
                  const imageContainer = document.getElementById("imageContainer");
                  imageElement.src = animeImage;
                  gif1Element.style.display = "block"
                  imageContainer.style.display = "block"

                  titleElement.innerHTML = `${animeTitle}`;
                  titleElement.style.top = "10%";
                  titleElement.style.left = "10%";
                  buttonElement.style.display = "none";
                  h1Element.style.display = "none";
                  h2Element.style.display = "none";
                  gifElement.style.display = "none";
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {
                      utterance: `${context.title}`,
                      voice: "ja-JP-NanamiNeural"
                    }
                  });
                },
                on: { SPEAK_COMPLETE: "Question" },
              },
              Refresh: {
                entry: ({ context }) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `There was a problem fetching the anime. Get a life or refresh the page` },
                  });
                },
              },
              Question: {
                entry: ({ context }) => {
                  const generateButton = document.getElementById("generate");
                  const yesButton = document.getElementById("yes");
                  const noButton = document.getElementById("no");
                  const question = document.getElementById("wouldYouLike");
                  generateButton.style.display = "block";
                  question.style.display = "block";
                  yesButton.style.display = "block";
                  noButton.style.display = "block";
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Would you like to know more about it?` }
                  });
                },
                on: {
                  CLICK_YES: { target: "Yes" },
                  CLICK_NO: { target: "No" },
                  GENERATE: { target: "Jikan" },
                },
              },
              Yes: {
                entry: ({ context }) => {
                  const generateButton = document.getElementById("generate");
                  generateButton.style.display = "block";
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `What would you like to know?` },
                  });
                },
                on: {
                  SPEAK_COMPLETE: { target: "Choose" },
                },
              },
              No: {
                entry: ({ context }) => {
                  const generateButton = document.getElementById("generate");
                  const yesButton = document.getElementById("yes");
                  const noButton = document.getElementById("no");
                  const question = document.getElementById("wouldYouLike");
                  const gif1Element = document.getElementById("point");
                  const dateElement = document.getElementById("aired");
                  const durationElement = document.getElementById("duration");
                  const episodesElement = document.getElementById("episodes");
                  const genresElement = document.getElementById("genre");
                  const popularityElement = document.getElementById("popularity");
                  const rankElement = document.getElementById("rank");
                  const ratingElement = document.getElementById("rating");
                  const scoreElement = document.getElementById("score");
                  const statusElement = document.getElementById("status");
                  const typeElement = document.getElementById("type");
                  generateButton.style.display = "none";
                  question.style.display = "none";
                  yesButton.style.display = "none";
                  noButton.style.display = "none";
                  gif1Element.style.display = "none";
                  dateElement.style.display = "none";
                  durationElement.style.display = "none";
                  episodesElement.style.display = "none";
                  genresElement.style.display = "none";
                  popularityElement.style.display = "none";
                  rankElement.style.display = "none";
                  ratingElement.style.display = "none";
                  scoreElement.style.display = "none";
                  statusElement.style.display = "none";
                  typeElement.style.display = "none";
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Okay. Enjoy your new anime!` },
                  });
                },
              },
              Choose: {
                entry: ({ context }) => {
                  const generateButton = document.getElementById("generate");
                  const yesButton = document.getElementById("yes");
                  const noButton = document.getElementById("no");
                  const question = document.getElementById("wouldYouLike");
                  const choices = document.getElementById("choices");
                  const generalChoices = document.getElementById("generalChoices");
                  const gif1Element = document.getElementById("point");
                  generateButton.style.display = "none";
                  question.style.display = "none";
                  yesButton.style.display = "none";
                  noButton.style.display = "none";
                  choices.style.display = "block";
                  generalChoices.style.display = "none";
                  gif1Element.style.display = "none";
                  context.spstRef.send({
                    type: "LISTEN",
                  });
                },
                on: {
                  RECOGNISED: [
                    {
                      target: "transportGeneral",
                      guard: ({ event }) => choicesGrammar.entities.general.some(generalElement => event.value[0].utterance.includes(generalElement))
                    },
                    {
                      target: "transportCharacters",
                      guard: ({ event }) => choicesGrammar.entities.characters.some(characterElement => event.value[0].utterance.includes(characterElement))
                      },
                    {
                        target: "transportStaff",
                        guard: ({ event }) => choicesGrammar.entities.staff.some(staffElement => event.value[0].utterance.includes(staffElement)),
                    },
                    {
                        target: "transportSimilar",
                        guard: ({ event }) => choicesGrammar.entities.similar.some(similarElement => event.value[0].utterance.includes(similarElement)),
                    },
                    {
                        target: "transportSynopsis",
                        guard: ({ event }) => choicesGrammar.entities.synopsis.some(synopsisElement => event.value[0].utterance.includes(synopsisElement)),
                    }            
                  ],
                },
              },
              transportGeneral: { entry: raise({ type: "GENERAL" }) },
              transportCharacters: { entry: raise({ type: "CHARACTERS" }) },
              transportStaff: { entry: raise({ type: "STAFF" }) },
              transportSimilar: { entry: raise({ type: "SIMILAR" }) },
              transportSynopsis: { entry: raise({ type: "SYNOPSIS" }) },
            },
          },
        },
      },
      General: {
        initial: "Idle",
        states: {
          Idle: { on: { GENERAL: "What" } },
          What: {
            entry: ({ context }) => {
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `What kind of information do you need?` },
              });
            },
            on: { SPEAK_COMPLETE: { target: "Choose" } }
          },
          Choose: {
            entry: ({ context }) => {
              const generateButton = document.getElementById("generate");
              const yesButton = document.getElementById("yes");
              const noButton = document.getElementById("no");
              const question = document.getElementById("wouldYouLike");
              const choices = document.getElementById("choices");
              const generalChoices = document.getElementById("generalChoices");
              const gif1Element = document.getElementById("point");
              generateButton.style.display = "none";
              question.style.display = "none";
              yesButton.style.display = "none";
              noButton.style.display = "none";
              choices.style.display = "none";
              generalChoices.style.display = "block";
              gif1Element.style.display = "none";
              context.spstRef.send({
                type: "LISTEN",
              });
            },
            on: {
              RECOGNISED: [{
                target: "Date",
                guard: ({ event }) => generalInformationGrammar.entities.date.some(dateElement => event.value[0].utterance.includes(dateElement)),
              },
              {
                target: "Duration",
                guard: ({ event }) => generalInformationGrammar.entities.duration.some(durationElement => event.value[0].utterance.includes(durationElement)),
              },
              {
                target: "Episodes",
                guard: ({ event }) => generalInformationGrammar.entities.episodes.some(episodesElement => event.value[0].utterance.includes(episodesElement)),
              },
              {
                target: "Genre",
                guard: ({ event }) => generalInformationGrammar.entities.genre.some(genreElement => event.value[0].utterance.includes(genreElement)),
              },
              {
                target: "Popularity",
                guard: ({ event }) => generalInformationGrammar.entities.popularity.some(popularityElement => event.value[0].utterance.includes(popularityElement)),
              },
              {
                target: "Rank",
                guard: ({ event }) => generalInformationGrammar.entities.ranking.some(rankingElement => event.value[0].utterance.includes(rankingElement)),
              },
              {
                target: "Rating",
                guard: ({ event }) => generalInformationGrammar.entities.rating.some(ratingElement => event.value[0].utterance.includes(ratingElement)),
              },
              {
                target: "Score",
                guard: ({ event }) => generalInformationGrammar.entities.score.some(scoreElement => event.value[0].utterance.includes(scoreElement)),
              },
              {
                target: "Status",
                guard: ({ event }) => generalInformationGrammar.entities.status.some(statusElement => event.value[0].utterance.includes(statusElement)),
              },
              {
                target: "Type",
                guard: ({ event }) => generalInformationGrammar.entities.type.some(typeElement => event.value[0].utterance.includes(typeElement)),
              },
              ]
            }
          },
          Date: {
            entry: ({ context }) => {
              const choices = document.getElementById("choices");
              const generalChoices = document.getElementById("generalChoices");
              const date = context.aired;
              const dateElement = document.getElementById("aired");
              choices.style.display = "none";
              generalChoices.style.display = "none";
              dateElement.innerHTML = `${date}`;
              dateElement.style.display = "block";
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `The release date is ${context.aired}` },
              });
            },
            on: {
              SPEAK_COMPLETE: { target: "More" },
            },
          },
          Duration: {
            entry: ({ context }) => {
              const choices = document.getElementById("choices");
              const generalChoices = document.getElementById("generalChoices");
              const duration = context.duration;
              const durationElement = document.getElementById("duration");
              choices.style.display = "none";
              generalChoices.style.display = "none";
              durationElement.innerHTML = `${duration}`;
              durationElement.style.display = "block";
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `The duration is ${context.duration}` },
              });
            },
            on: {
              SPEAK_COMPLETE: { target: "More" },
            },
          },
          Episodes: {
            entry: ({ context }) => {
              const choices = document.getElementById("choices");
              const generalChoices = document.getElementById("generalChoices");
              const episodes = context.episodes;
              const episodesElement = document.getElementById("episodes");
              choices.style.display = "none";
              generalChoices.style.display = "none";
              episodesElement.innerHTML = `${episodes}`;
              episodesElement.style.display = "block";
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `It is ${context.episodes} episode` },
              });
            },
            on: {
              SPEAK_COMPLETE: { target: "More" },
            },
          },
          Genre: {
            entry: ({ context }) => {
              const choices = document.getElementById("choices");
              const generalChoices = document.getElementById("generalChoices");
              const genres = context.genre;
              const genresElement = document.getElementById("genre");
              choices.style.display = "none";
              generalChoices.style.display = "none";
              genresElement.innerHTML = `${genres}`;
              genresElement.style.display = "block";
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `The genre is ${context.genre}` },
              });
            },
            on: {
              SPEAK_COMPLETE: { target: "More" },
            },
          },
          Popularity: {
            entry: ({ context }) => {
              const choices = document.getElementById("choices");
              const generalChoices = document.getElementById("generalChoices");
              const popularity = context.popularity;
              const popularityElement = document.getElementById("popularity");
              choices.style.display = "none";
              generalChoices.style.display = "none";
              popularityElement.innerHTML = `${popularity}`;
              popularityElement.style.display = "block";
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `The place on the popularity board is ${context.popularity}` },
              });
            },
            on: {
              SPEAK_COMPLETE: { target: "More" },
            },
          },
          Rank: {
            entry: ({ context }) => {
              const choices = document.getElementById("choices");
              const generalChoices = document.getElementById("generalChoices");
              const rank = context.aired;
              const rankElement = document.getElementById("rank");
              choices.style.display = "none";
              generalChoices.style.display = "none";
              rankElement.innerHTML = `${rank}`;
              rankElement.style.display = "block";
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `The place on the ranking board is ${context.rank}` },
              });
            },
            on: {
              SPEAK_COMPLETE: { target: "More" },
            },
          },
          Rating: {
            entry: ({ context }) => {
              const choices = document.getElementById("choices");
              const generalChoices = document.getElementById("generalChoices");
              const rating = context.rating;
              const ratingElement = document.getElementById("rating");
              choices.style.display = "none";
              generalChoices.style.display = "none";
              ratingElement.innerHTML = `${rating}`;
              ratingElement.style.display = "block";
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `The rating is ${context.rating}` },
              });
            },
            on: {
              SPEAK_COMPLETE: { target: "More" },
            },
          },
          Score: {
            entry: ({ context }) => {
              const choices = document.getElementById("choices");
              const generalChoices = document.getElementById("generalChoices");
              const score = context.score;
              const scoreElement = document.getElementById("score");
              choices.style.display = "none";
              generalChoices.style.display = "none";
              scoreElement.innerHTML = `${score}`;
              scoreElement.style.display = "block";
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `The score is ${context.score}` },
              });
            },
            on: {
              SPEAK_COMPLETE: { target: "More" },
            },
          },
          Status: {
            entry: ({ context }) => {
              const choices = document.getElementById("choices");
              const generalChoices = document.getElementById("generalChoices");
              const status = context.status;
              const statusElement = document.getElementById("status");
              choices.style.display = "none";
              generalChoices.style.display = "none";
              statusElement.innerHTML = `${status}`;
              statusElement.style.display = "block";
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `The status is ${context.status}` },
              });
            },
            on: {
              SPEAK_COMPLETE: { target: "More" },
            },
          },
          Type: {
            entry: ({ context }) => {
              const choices = document.getElementById("choices");
              const generalChoices = document.getElementById("generalChoices");
              const type = context.type;
              const typeElement = document.getElementById("type");
              choices.style.display = "none";
              generalChoices.style.display = "none";
              typeElement.innerHTML = `${type}`;
              typeElement.style.display = "block";
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `It's a ${context.type}` },
              });
            },
            on: {
              SPEAK_COMPLETE: { target: "More" },
            },
          },
          More: {
            entry: ({ context }) => {
              const generateButton = document.getElementById("generate");
              const yesButton = document.getElementById("yes");
              const noButton = document.getElementById("no");
              const choices = document.getElementById("choices");
              const generalChoices = document.getElementById("generalChoices");
              const dateElement = document.getElementById("aired");
              const durationElement = document.getElementById("duration");
              const episodesElement = document.getElementById("episodes");
              const genresElement = document.getElementById("genre");
              const popularityElement = document.getElementById("popularity");
              const rankElement = document.getElementById("rank");
              const ratingElement = document.getElementById("rank");
              const scoreElement = document.getElementById("score");
              const statusElement = document.getElementById("status");
              const typeElement = document.getElementById("type");
              generateButton.style.display = "block";
              yesButton.style.display = "block";
              noButton.style.display = "block";
              choices.style.display = "none";
              generalChoices.style.display = "none";
              dateElement.style.display = "none";
              durationElement.style.display = "none";
              episodesElement.style.display = "none";
              genresElement.style.display = "none";
              popularityElement.style.display = "none";
              rankElement.style.display = "none";
              ratingElement.style.display = "none";
              scoreElement.style.display = "none";
              statusElement.style.display = "none";
              typeElement.style.display = "none";
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `Would you like to know something more?` },
              });
            },
            on: {
              CLICK_YES: { target: "#root.Random.Prompt.Yes" },
              CLICK_NO: { target: "#root.Random.Prompt.No" },
              GENERATE: { target: "#root.Random.Prompt.Jikan" },
            },
          }
        },
      },
      Characters: {
        initial: "Idle",
        states: {
          Idle: { on: { CHARACTERS: "Jikan" } },
          Jikan: {
            invoke: {
              src: fromPromise(async ({ input }) => {
                const data = await fetchAnimeCharacters(input.id);
                return data;
              }),
              input: ({ context }) => ({
                id: context.id,
              }),
              onDone: [{
                target: "animeCharacters",
                guard: ({ event }) => event.output.message === "true" && event.output.anime.data.length > 0,
                actions: [
                  ({ event }) => console.log(event.output),
                  assign({
                    character1image: ({ event }) => event.output.anime.data[0].character.images.jpg.image_url,
                    character1name: ({ event }) => event.output.anime.data[0].character.name,
                    character2image: ({ event }) => event.output.anime.data[1].character.images.jpg.image_url,
                    character2name: ({ event }) => event.output.anime.data[1].character.name,
                    character3image: ({ event }) => event.output.anime.data[2].character.images.jpg.image_url,
                    character3name: ({ event }) => event.output.anime.data[2].character.name,
                  }),
                ],
              },
              {
                target: "noAnimeCharacters",
                guard: ({ event }) => event.output.message === "true" && event.output.anime.data.length === 0,
              },
              {
                target: "Jikan",
                guard: ({ event }) => event.output.message === "false",
              },
              {
                target: "Refresh",
                guard: ({ event }) => event.output.message === "false1"
              },
              ],
            },
          },
          animeCharacters: {
            entry: ({ context }) => {
              const animeTitle = context.title;
              const animeImage = context.image;
              const choices = document.getElementById("choices");
              const titleElement = document.getElementById("animeTitleElementId");
              const imageElement = document.getElementById("animeImageElementId");
              const character1Image = context.character1image;
              const character1Name = context.character1name;
              const character2Image = context.character2image;
              const character2Name = context.character2name;
              const character3Image = context.character3image;
              const character3Name = context.character3name;
              const character1NameElement = document.getElementById("character1NameElement");
              const character2NameElement = document.getElementById("character2NameElement");
              const character3NameElement = document.getElementById("character3NameElement");
              const character1ImageElement = document.getElementById("character1ImageElement");
              const character2ImageElement = document.getElementById("character2ImageElement");
              const character3ImageElement = document.getElementById("character3ImageElement");
              const buttonElement = document.getElementById("button");
              const h1Element = document.getElementById("h1");
              const h2Element = document.getElementById("h2");
              const gifElement = document.getElementById("sailor");
              const gif1Element = document.getElementById("point");
              const imageContainer = document.getElementById("imageContainer");
              const characterImagesContainer = document.getElementById("characterImagesContainer")
              character1ImageElement.src = character1Image;
              character2ImageElement.src = character2Image;
              character3ImageElement.src = character3Image;
              gif1Element.style.display = "none";
              imageContainer.style.display = "block";
              characterImagesContainer.style.display = "flex";
              imageElement.src = animeImage;

              titleElement.innerHTML = `${animeTitle}`;
              character1NameElement.innerHTML = `${character1Name}`
              character2NameElement.innerHTML = `${character2Name}`
              character3NameElement.innerHTML = `${character3Name}`
              titleElement.style.top = "10%";
              titleElement.style.left = "10%";
              choices.style.display = "none";
              buttonElement.style.display = "none";
              h1Element.style.display = "none";
              h2Element.style.display = "none";
              gifElement.style.display = "none";
              context.spstRef.send({
                type: "SPEAK",
                value: {
                  utterance: `${character1Name}, ${character2Name}, ${character3Name}`,
                  voice: "ja-JP-NanamiNeural"
                }
              });
            },
            on: { SPEAK_COMPLETE: "More" },
          },
          noAnimeCharacters: {
            entry: ({ context }) => {
              const choices = document.getElementById("choices");
              choices.style.display = "none";
              context.spstRef.send({
                type: "SPEAK",
                value: {utterance: `There is no character information available`}
              });
            },
            on: { SPEAK_COMPLETE: "More" },
          },
          Refresh: {
            entry: ({ context }) => {
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `There was a problem fetching the anime. Get a life or refresh the page` },
              });
            },
          },
          More: {
            entry: ({ context }) => {
              const generateButton = document.getElementById("generate");
              const yesButton = document.getElementById("yes");
              const noButton = document.getElementById("no");
              const character1NameElement = document.getElementById("character1NameElement");
              const character2NameElement = document.getElementById("character2NameElement");
              const character3NameElement = document.getElementById("character3NameElement");
              const character1ImageElement = document.getElementById("character1ImageElement");
              const character2ImageElement = document.getElementById("character2ImageElement");
              const character3ImageElement = document.getElementById("character3ImageElement");
              generateButton.style.display = "block";
              yesButton.style.display = "block";
              noButton.style.display = "block";
              character1NameElement.style.display = "none";
              character2NameElement.style.display = "none";
              character3NameElement.style.display = "none";
              character1ImageElement.style.display =  "none";
              character2ImageElement.style.display = "none";
              character3ImageElement.style.display = "none";
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `Would you like to know something more?` },
              });
            },
            on: {
              CLICK_YES: { target: "#root.Random.Prompt.Yes" },
              CLICK_NO: { target: "#root.Random.Prompt.No" },
              GENERATE: { target: "#root.Random.Prompt.Jikan" },
            },
          }
        }
      },
      Staff: {
        initial: "Idle",
        states: {
          Idle: { on: { STAFF: "Jikan" } },
          Jikan: {
            invoke: {
              src: fromPromise(async ({ input }) => {
                const data = await fetchAnimeStaff(input.id);
                return data;
              }),
              input: ({ context }) => ({
                id: context.id,
              }),
              onDone: [{
                target: "animeStaff",
                guard: ({ event }) => event.output.message === "true" && event.output.anime.data.length > 0,
                actions: [
                  ({ event }) => console.log(event.output),
                  assign({
                    person1image: ({ event }) => event.output.anime.data[0].person.images.jpg.image_url,
                    person1name: ({ event }) => event.output.anime.data[0].person.name,
                    person1role: ({ event }) => event.output.anime.data[0].positions[0],
                    person2image: ({ event }) => event.output.anime.data[1].person.images.jpg.image_url,
                    person2name: ({ event }) => event.output.anime.data[1].person.name,
                    person2role: ({ event }) => event.output.anime.data[1].positions[0],
                    person3image: ({ event }) => event.output.anime.data[2].person.images.jpg.image_url,
                    person3name: ({ event }) => event.output.anime.data[2].person.name,
                    person3role: ({ event }) => event.output.anime.data[2].positions[0]
                  }),
                ],
              },
              {
                target: "noAnimeStaff",
                guard: ({ event }) => event.output.message === "true" && event.output.anime.data.length === 0,
              },
              {
                target: "Jikan",
                guard: ({ event }) => event.output.message === "false",
              },
              {
                target: "Refresh",
                guard: ({ event }) => event.output.message === "false1"
              },
              ],
            },
          },
          animeStaff: {
            entry: ({ context }) => {
              const animeTitle = context.title;
              const animeImage = context.image;
              const choices = document.getElementById("choices");
              const titleElement = document.getElementById("animeTitleElementId");
              const imageElement = document.getElementById("animeImageElementId");
              const person1Image = context.person1image;
              const person1Name = context.person1name;
              const person1Role = context.person1role;
              const person2Image = context.person2image;
              const person2Name = context.person2name;
              const person2Role = context.person2role;
              const person3Image = context.person3image;
              const person3Name = context.person3name;
              const person3Role = context.person3role;
              const person1NameElement = document.getElementById("person1NameElement");
              const person2NameElement = document.getElementById("person2NameElement");
              const person3NameElement = document.getElementById("person3NameElement");
              const person1ImageElement = document.getElementById("person1ImageElement");
              const person2ImageElement = document.getElementById("person2ImageElement");
              const person3ImageElement = document.getElementById("person3ImageElement");
              const person1RoleElement = document.getElementById("person1RoleElement");
              const person2RoleElement = document.getElementById("person2RoleElement");
              const person3RoleElement = document.getElementById("person3RoleElement");
              const buttonElement = document.getElementById("button");
              const h1Element = document.getElementById("h1");
              const h2Element = document.getElementById("h2");
              const gifElement = document.getElementById("sailor");
              const gif1Element = document.getElementById("point");
              const imageContainer = document.getElementById("imageContainer");
              const personImagesContainer = document.getElementById("personImagesContainer")
              person1ImageElement.src = person1Image;
              person2ImageElement.src = person2Image;
              person3ImageElement.src = person3Image;
              gif1Element.style.display = "none";
              imageContainer.style.display = "block";
              personImagesContainer.style.display = "flex";
              imageElement.src = animeImage;

              titleElement.innerHTML = `${animeTitle}`;
              person1NameElement.innerHTML = `${person1Name}`
              person2NameElement.innerHTML = `${person2Name}`
              person3NameElement.innerHTML = `${person3Name}`
              person1RoleElement.innerHTML = `${person1Role}`
              person2RoleElement.innerHTML = `${person2Role}`
              person3RoleElement.innerHTML = `${person3Role}`
              titleElement.style.top = "10%";
              titleElement.style.left = "10%";
              choices.style.display = "none";
              buttonElement.style.display = "none";
              h1Element.style.display = "none";
              h2Element.style.display = "none";
              gifElement.style.display = "none";
              context.spstRef.send({
                type: "SPEAK",
                value: {
                  utterance: `${person1Name}, ${person2Name}, ${person3Name}`,
                  voice: "ja-JP-NanamiNeural"
                }
              });
            },
            on: { SPEAK_COMPLETE: "More" },
          },
          noAnimeStaff: {
            entry: ({ context }) => {
              const choices = document.getElementById("choices");
              choices.style.display = "none";
              context.spstRef.send({
                type: "SPEAK",
                value: {utterance: `There is no staff information available`}
              });
            },
            on: { SPEAK_COMPLETE: "More" },
          },
          Refresh: {
            entry: ({ context }) => {
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `There was a problem fetching the anime. Get a life or refresh the page` },
              });
            },
          },
          More: {
            entry: ({ context }) => {
              const generateButton = document.getElementById("generate");
              const yesButton = document.getElementById("yes");
              const noButton = document.getElementById("no");
              const person1NameElement = document.getElementById("person1NameElement");
              const person2NameElement = document.getElementById("person2NameElement");
              const person3NameElement = document.getElementById("person3NameElement");
              const person1ImageElement = document.getElementById("person1ImageElement");
              const person2ImageElement = document.getElementById("person2ImageElement");
              const person3ImageElement = document.getElementById("person3ImageElement");
              const person1RoleElement = document.getElementById("person1RoleElement");
              const person2RoleElement = document.getElementById("person2RoleElement");
              const person3RoleElement = document.getElementById("person3RoleElement");
              generateButton.style.display = "block";
              yesButton.style.display = "block";
              noButton.style.display = "block";
              person1NameElement.style.display = "none";
              person2NameElement.style.display = "none";
              person3NameElement.style.display = "none";
              person1ImageElement.style.display =  "none";
              person2ImageElement.style.display = "none";
              person3ImageElement.style.display = "none";
              person1RoleElement.style.display = "none";
              person2RoleElement.style.display = "none";
              person3RoleElement.style.display = "none";
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `Would you like to know something more?` },
              });
            },
            on: {
              CLICK_YES: { target: "#root.Random.Prompt.Yes" },
              CLICK_NO: { target: "#root.Random.Prompt.No" },
              GENERATE: { target: "#root.Random.Prompt.Jikan" },
            },
          }
        }
      },
      Similar: {
        initial: "Idle",
        states: {
          Idle: { on: { SIMILAR: "Jikan" } },
          Jikan: {
            invoke: {
              src: fromPromise(async ({ input }) => {
                const data = await fetchAnimeRecommendations(input.id);
                return data;
              }),
              input: ({ context }) => ({
                id: context.id,
              }),
              onDone: [{
                target: "animeRecommendations",
                guard: ({ event }) => event.output.message === "true" && event.output.anime.data.length > 0,
                actions: [
                  ({ event }) => console.log(event.output),
                  assign({
                    anime1image: ({ event }) => event.output.anime.data[0].entry.images.jpg.image_url,
                    anime1name: ({ event }) => event.output.anime.data[0].entry.title,
                    anime2image: ({ event }) => event.output.anime.data[1].entry.images.jpg.image_url,
                    anime2name: ({ event }) => event.output.anime.data[1].entry.title,
                    anime3image: ({ event }) => event.output.anime.data[2].entry.images.jpg.image_url,
                    anime3name: ({ event }) => event.output.anime.data[2].entry.title,
                  }),
                ],
              },
              {
                target: "noAnimeRecommendations",
                guard: ({ event }) => event.output.message === "true" && event.output.anime.data.length === 0,
              },
              {
                target: "Jikan",
                guard: ({ event }) => event.output.message === "false",
              },
              {
                target: "Refresh",
                guard: ({ event }) => event.output.message === "false1"
              },
              ],
            },
          },
          animeRecommendations: {
            entry: ({ context }) => {
              const animeTitle = context.title;
              const animeImage = context.image;
              const choices = document.getElementById("choices");
              const titleElement = document.getElementById("animeTitleElementId");
              const imageElement = document.getElementById("animeImageElementId");
              const anime1Image = context.anime1image;
              const anime1Name = context.anime1name;
              const anime2Image = context.anime2image;
              const anime2Name = context.anime2name;
              const anime3Image = context.anime3image;
              const anime3Name = context.anime3name;
              const anime1NameElement = document.getElementById("anime1NameElement");
              const anime2NameElement = document.getElementById("anime2NameElement");
              const anime3NameElement = document.getElementById("anime3NameElement");
              const anime1ImageElement = document.getElementById("anime1ImageElement");
              const anime2ImageElement = document.getElementById("anime2ImageElement");
              const anime3ImageElement = document.getElementById("anime3ImageElement");
              const buttonElement = document.getElementById("button");
              const h1Element = document.getElementById("h1");
              const h2Element = document.getElementById("h2");
              const gifElement = document.getElementById("sailor");
              const gif1Element = document.getElementById("point");
              const imageContainer = document.getElementById("imageContainer");
              const animeImagesContainer = document.getElementById("animeImagesContainer")
              anime1ImageElement.src = anime1Image;
              anime2ImageElement.src = anime2Image;
              anime3ImageElement.src = anime3Image;
              choices.style.display = "none";
              gif1Element.style.display = "none";
              imageContainer.style.display = "block";
              animeImagesContainer.style.display = "flex";
              imageElement.src = animeImage;

              titleElement.innerHTML = `${animeTitle}`;
              anime1NameElement.innerHTML = `${anime1Name}`
              anime2NameElement.innerHTML = `${anime2Name}`
              anime3NameElement.innerHTML = `${anime3Name}`
              titleElement.style.top = "10%";
              titleElement.style.left = "10%";
              choices.style.display = "none";
              buttonElement.style.display = "none";
              h1Element.style.display = "none";
              h2Element.style.display = "none";
              gifElement.style.display = "none";
              context.spstRef.send({
                type: "SPEAK",
                value: {
                  utterance: `${anime1Name}, ${anime2Name}, ${anime3Name}`,
                  voice: "ja-JP-NanamiNeural"
                }
              });
            },
            on: { SPEAK_COMPLETE: "More" },
          },
          noAnimeRecommendations: {
            entry: ({ context }) => {
              const choices = document.getElementById("choices");
              choices.style.display = "none";
              context.spstRef.send({
                type: "SPEAK",
                value: {utterance: `There is no similar anime available`}
              });
            },
            on: { SPEAK_COMPLETE: "More" },
          },
          Refresh: {
            entry: ({ context }) => {
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `There was a problem fetching the anime. Get a life or refresh the page` },
              });
            },
          },
          More: {
            entry: ({ context }) => {
              const generateButton = document.getElementById("generate");
              const yesButton = document.getElementById("yes");
              const noButton = document.getElementById("no");
              const anime1NameElement = document.getElementById("anime1NameElement");
              const anime2NameElement = document.getElementById("anime2NameElement");
              const anime3NameElement = document.getElementById("anime3NameElement");
              const anime1ImageElement = document.getElementById("anime1ImageElement");
              const anime2ImageElement = document.getElementById("anime2ImageElement");
              const anime3ImageElement = document.getElementById("anime3ImageElement");
              generateButton.style.display = "block";
              yesButton.style.display = "block";
              noButton.style.display = "block";
              anime1NameElement.style.display = "none";
              anime2NameElement.style.display = "none";
              anime3NameElement.style.display = "none";
              anime1ImageElement.style.display =  "none";
              anime2ImageElement.style.display = "none";
              anime3ImageElement.style.display = "none";
              context.spstRef.send({
                type: "SPEAK",
                value: { utterance: `Would you like to know something more?` },
              });
            },
            on: {
              CLICK_YES: { target: "#root.Random.Prompt.Yes" },
              CLICK_NO: { target: "#root.Random.Prompt.No" },
              GENERATE: { target: "#root.Random.Prompt.Jikan" },
            },
          }
        }
      },
      Synopsis: {
        initial: "Idle",
        states: {
          Idle: { on: { SYNOPSIS: "Jikan" } },
          Jikan: {
            invoke: {
              src: fromPromise(async ({ input }) => {
                const data = await fetchAnimeInformation(input.id);
                return data;
              }),
              input: ({ context }) => ({
                id: context.id,
              }),
              onDone: [{
                target: "animeSynopsis",
                guard: ({ event }) => event.output.message === "true",
                actions: [
                  ({ event }) => console.log(event.output),
                  assign({
                    synopsis: ({ event }) => event.output.anime.data.synopsis,
                  }),
                ],
              },
              {
                target: "Jikan",
                guard: ({ event }) => event.output.message === "false",
              },
              {
                target: "Refresh",
                guard: ({ event }) => event.output.message === "false1"
              },
              ],
            },
          },
        animeSynopsis: {
          entry: ({ context }) => {
            const animeTitle = context.title;
            const animeImage = context.image;
            const synopsis = context.synopsis
            const choices = document.getElementById("choices");
            const titleElement = document.getElementById("animeTitleElementId");
            const imageElement = document.getElementById("animeImageElementId");
            const buttonElement = document.getElementById("button");
            const h1Element = document.getElementById("h1");
            const h2Element = document.getElementById("h2");
            const gifElement = document.getElementById("sailor");
            const gif1Element = document.getElementById("point");
            const imageContainer = document.getElementById("imageContainer");
            const animeImagesContainer = document.getElementById("animeImagesContainer")
            choices.style.display = "none";
            gif1Element.style.display = "none";
            imageContainer.style.display = "block";
            animeImagesContainer.style.display = "block";
            imageElement.src = animeImage;
            titleElement.innerHTML = `${animeTitle}`;
            titleElement.style.top = "10%";
            titleElement.style.left = "10%";
            choices.style.display = "none";
            buttonElement.style.display = "none";
            h1Element.style.display = "none";
            h2Element.style.display = "none";
            gifElement.style.display = "none";
            context.spstRef.send({
              type: "SPEAK",
              value: { utterance: `${synopsis}`}
            });
          },
          on: { SPEAK_COMPLETE: "More" },
        },
        Refresh: {
          entry: ({ context }) => {
            context.spstRef.send({
              type: "SPEAK",
              value: { utterance: `There was a problem fetching the anime. Get a life or refresh the page` },
            });
          },
        },
        More: {
          entry: ({ context }) => {
            const generateButton = document.getElementById("generate");
            const yesButton = document.getElementById("yes");
            const noButton = document.getElementById("no");
            generateButton.style.display = "block";
            yesButton.style.display = "block";
            noButton.style.display = "block";
            context.spstRef.send({
              type: "SPEAK",
              value: { utterance: `Would you like to know something more?` },
            });
          },
          on: {
            CLICK_YES: { target: "#root.Random.Prompt.Yes" },
            CLICK_NO: { target: "#root.Random.Prompt.No" },
            GENERATE: { target: "#root.Random.Prompt.Jikan" },
          },
        }
      }
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
          value: { utterance: "Your next anime is" },
        });
      },
        "gui.PageLoaded": ({ }) => {
          document.getElementById("button").innerText = "CLICK ME";
        },
          "gui.Inactive": ({ }) => {
            document.getElementById("button").innerText = "Inactive";
          },
            "gui.Idle": ({ }) => {
              document.getElementById("button").innerText = "Waiting...";
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
document.getElementById("yes").onclick = () => actor.send({ type: "CLICK_YES" });
document.getElementById("no").onclick = () => actor.send({ type: "CLICK_NO" });
document.getElementById("generate").onclick = () => actor.send({ type: "GENERATE" });

actor.subscribe((state) => {
  console.log(state.value);
});
