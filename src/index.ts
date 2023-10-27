import { createMachine, createActor, assign, fromPromise, raise } from "xstate";
import { speechstate, Settings, Hypothesis } from "speechstate";
import { doneInvokeEventType } from "xstate/dist/declarations/src/actions";
import { grammar } from './grammar';
import {azureCredentials, spoty, device_id} from './keys';
import {fetchFromChatGPT} from './API';


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

    const ToLowerCase = (sentence: string, entity: string) => {
      console.log(sentence.toLowerCase().replace(/\?$/, ''))
    if (sentence.toLowerCase().replace(/\?$/, '') in grammar) {
      if (entity in grammar[sentence.toLowerCase().replace(/\?$/, '')].entities) {
        return grammar[sentence.toLowerCase().replace(/\?$/, '')].entities[entity];
      }
    }
        return false;
    };

// machine
const dmMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QCcD2qAuA6AIgSwEMAbVKAVzAFkCA7AmZLABWTAAcDWBiAQQGUASgBUhfAPoCAojxwBNANoAGALqJQbVLDwY8qGmpAAPRACYAzIqwBOAKxmAjABYzAdgAcVxfftubAGhAAT0QfADZrK0iXR0UTNzdFNxMbAF8UgLRMXEIScipaejBGATACCECsAAlUAHcAYVoASUqwIjYuPiZpAGkxOoB5SiYAGUkhSSVVJBANLR09A2MEe3dLUJtQ1zMzE0VFKxMA4IQ40McsRysXFx9rx0c3F1C0jPRsfGJSCmo6BiwSsoVHiwADWXDqw0adV6UgGlEokgAcjgeEJGv1EZMDLNtLp9NMliYTJssHYDt4nqEokdEGZQoozFhtvZFKFQvYzo4bG4XiBMu8cl98r8iv9SuUsMCwRCob0AOJjMQ8YSNPiiMSIngIpV8bpY6Y4+b40CE4mMskmCls6lBELrc4M9bbS7mKzrXn87KfPI-QrFcVA0HgyHQsSUWRiPgYuV8fXqTS4hYE0xm0lmckra1XGkIBws6xPbbmMxuZwmD1vL25b4FP4AiVS4OyvpSVGSMQjHiySFquMzBNGxYhFyeLAuYnjnzmdZuHM7ewmMeOa4JGz2DZEitZD7V4V+sWAyVBmWhgBijWRSpVvZU2IHeKHJ1TFqtVOztpOVysFyeJlsngSOItwFb0axFf1DylMQADNUGQMQtBoBgOi6HhejhEYxgmW8DXvJMTVMa5vyeGwNhdLwrBzP8Rx-UI-xsADYh5dI+UrHchV9OsAyPEEELwJCii4WF+jlRFVUkHA+0NB9k1zacsFCR4TBcGxFGiDwqKsZwsFiBxPCsOkVnMYCqw42tRXrCo6kqVEuAgPQwCwfiADdUBBRzPXYn1zIgiVrNRBAXNQABjAgjUmKS8ONIxaU2SwSLMblQhUnw7Co+JLA5TZ4hiNwnFSFjPMFbzwIPPybKELgijQRg2CIMLYOQABbLAitAvcuMPfyhECmhXNC8KVEiuYZII3M4rHJ0kpS3wzE02wsCJTZ7icYkqRMrywP3SysDlJghDESRkBqlCej6QZMPGYbE2ipZSISUl1xuDYNxsRx5sZcc6LcOLSP2MwNuKrbOr8gALMKlRoWAakEzozow0Yrpw+MRvwmLcxcBlrBsOJZsUqxUpzFZojHH6bCeAn1mSAHCrYoGOos7iEawvoKtOtDzqGRHsKmFGbsfJSsFuNd1hZOkSznF6sDcBxEgOHYbkB9rOMZyDQVZ2zhNE8TJOR-tUdukI-3OektPMextmuHG528ewl2uaI7HJxSadebd6ZV3zA147qhMkAZtb4CT5HsXn9f52SFy0hT9kcc3LZUw4P3TWJpdluiNliWxXdY93lZ8sqKgARQoWAjQ1yq4Y55mkbD6S0aWFYHvWTYXCLPYDht7x7eiGc-wJpXd09wusFPfi8FgUGK-Z9CLu567B1k+7LDXcn1xb5J3uTzxFxllkM-pejB7M0qdpgDAxE4HQy9gMQ6CasBL6DKvZ65rCF9G9Hp3COILctZatJtyJiWb8dgzj6XMIoAqbsQJDwLmfMAF8r4TwwLfe+j8TB+wDmJIOus65RQFgcNO3IrjsjsJaewRMtLhEdBsaIyRYjulpnnOBp9uLn0vsga+qC74EAfmITBWscHB1DneA2j4o4m1jvHVwicqJ0XOHSRw1p9iAUUsfEq212GIM4dwtBfCMFYJEsIySJh8HiMjsbGOZsHAJ2th+ewX4haQMcUkKBKkNHA1VhKMgNBWAEGCuDAARkQMAM9OaXR5mIiOY0LbJTHG6LSVgkgqUSKEKhcQFLmz2IpDwq5PEMy9lgDhyCb68IfnZByWAy5hQ8nTfObDDwlK4Sg-RD8P4N0QILYWHI1yOglg4p2ClHH6UceuEs0Dc6wJPloppOjSk8PQeEmuUTcIWLGt0x4Is+ni1nA4h4NghauPcCYB4MsHgFOHggpBLSy5iDwBASpNBHJBXcq1eprDZkSmadw+5EBer9TCniCKet66G2WFY02cdbGyPsccBcyQmT7GztERxcdmIwNMpokGFQfkoL+VVY6cEsB1QanBFqbVPk4uKfM25F8HkApCkCvQILzExPRpI6x0KLawqTvCuw5x3Ci0iDjdYalLnwO4gsv5SomCNEOgIAQ-QBDLLnu-UFBDZK7A2NjHYzhIj0i8ETOwjJThrkAiyLkErGkSgwMgAJIJb4PNgKqt+tdomL1iasBSGwtg7A7nyo2yjSbCrbqyfY1qvkVAwKgNgCE9BQBdfZZ5Tk+puTqSwmZ1KY1xtgAm2AjKBrAqGhq9ZX9nzpgoZSG08KiSHIsCK1wjg0VAWYdM7F3iKh5qQghUGZBoLQVCa6yJHTwUxAMjpTGiU27eHMMonM-5Fpk0tPcLwbdHCRupfamg9kmrxp7aSwIglk0vLTW8ylWbO2tVoLu-dUAxCHqKIW5lNBWUes-ksTZKVRb9L2ccPKbgdJKLdMpVwMsMVTKxV4op27b3dvvY+5AhKaokvqhgRqFKPmXpgze1Ae74MPvqke5Az7BrKFHQLccQstm9LFtlImlq0zrFUsoq4jtN1XsQ2IaqcFh3z1Ley00JIXyZjfC4BjWNHT0nuM4ccOcL0dpg2AYKehnnBQwE2UMrAVM0DUxgCjslxbxSmj9GaaUHFiyA2yRQMnXDGTbVBwpI8agEG0GIByCFlNcEMDUjAjkCDQT88gAAFCyPYABKLgCnoPOdcxfDzsBlMGdiZC6RMKraBoQABqzlw6Jt3cCWDjRSOHBTIMdMANAbm-PsE809rlz1YcUyPErZXWCVd0fi+wpHi3kYE56jl3qW5+t2PsTLI5DlQMiKWZInh1guCKyPAjEAwoED4+qtl-WhPmkra+GtXSORMb+qc64Ox5ONZi9csQpXyvtYWbV1N9WM3tou9oi+122tVZQd1llJaNsfsQA8ZtCkdgGTUr+S0OZcljmJAxZK1E44boc5tJzO0OBkES4RggxH7uvKe45q53E0cY8Q9919v332dIQGuS4BZkrrk8G3UiOYbh2ynSyR4Mn6STOiyjqV6sdM6BoBQNb7q1mCcQNT78pDnoM8Sv4D8pFFyRCm5sKkZx1pI49pKtWvEBf8QoGIGrQidbJfRmYGn7hPBQPXNT83RNEiWGbflbwFgZYHAWztKCeuhePyN-7YxJvRFi827SC3Hg9ir1t1vY4uwSZKOSl4ZK475ua4aVGniV29CC4N377BJuzEU-Beb4i4frekScHbj8DDGTsmUclekFhNjc-O7zw80EyBECIAhHNIvVl8xD8sQbvq27+tG-IrkY5zfKOcOuLkEGecE8PAQdWjVL53zADUPiAkkMvwifxv7lOv3bLowM+FHhDlgLIs4NcHvuIubczVnzGBalYAC0F4LhrFCRYX9riU9+L72Cm6EhESTSkTgK7COI5jZaOi5agYFbz4t6L4SgCC4b4YJpiBjw0ATygy95AG0jySKTjipLqSUQfh5ThCX6qTHZtz2aYrI5IHewSCoGRgJpGKBzBx9b-bjQWCgGJSmbmrmbHA3CWC7AOB5Y+Djq3465ME7p4YsFIRsEmIhwH5F4TQJTTQCFzRkHrhjgMgsg7J-ixBSG2p4D8KoBkBILqwoGyF7p8CsG74rJ4FyR0gKRKTEEPCkFCHdwwFujW70LGEVCwZyEEYVaPIOFqqi795cHjqMhqQMjkx5hzrpIfjCGLR6HiGlgRqp5UpXpBFoE9plyxqKEm6cGU73BXBAYARujLheDR6IDJSfSqTuK9ykQ7ABFYDPKb7wa4GlFjr-STrxEzoLjm7JH-o6Fs7W4MiGHljZHYYjxNSBB3pJpVK47vKZpNY7QLFLGk5vrB5cHKQ0QkRkQHAURzhywXBRBsjF4kTtElB1SLHwYurhFup97hwD6nbhCEHKSqQkFdyWCkJFjbClhtGzEbF35xbea+b+aBZFDBYWARZRaIG-4VD-5OFGa8EaGpRaHHCJG0TOjKR7CuDPCgkvaHh3FEAPH5oCI9EqGPiuBYy2C4xgIeCEzJzbCMiXBWwxDkwJAIHrGkkShCCxpLE0mF4SJD6tztxj7JwciLjUEZYbC2C3HKZ4YPw7ovo45np470HIligqZNRqnLZGg7Hk57GU4HHETMbgGnHJzch2y+Bch7ArDkyUzKnBRPGoSvwjq9F0kEFuE-EeFzgN5MjpzsicjcjtF1D+J+YdhEZEAoKilmlF5+lEEBkaTJwqTfiJD7zm7rhg7tFQSHrxllzFG4Jolh5W6R4V51G5j3ATZ5QsgrBOAWykQFnqxFkJnG5llB5RGU7F6kyVk27VlBkHbMishxxUi+AGTtE4AVaBCJm9ngpH60a-ojnhBjlnDEjJIMRnb8mt4ShNToAQCY6BDFkabPHem0mRyZFMhw7g5NGCEpgrBHJciRDOCsiliI50Fa42oVCHmoDHkdl3LL5ghdkcFXljT9mW4R5DnOA1mGHxTLgOy2AeGbDtH-mAVxn4ogWlkiIQVm4VkwXl5wVUQUyLTLiqSVrci+Ap7flp7UqwBlAnlnmXxQwww76el77rZimyTLk-q7KaR7A9xERvQeDEl0U5FFLgxsBsCLFAVIJsWwycWOE+m8VUY9L8X0ZV5kXHY7ZOAOztF8BMXyWamPZrHPb7kVBGWYVY5nkmm9b4WNypY2I8oZbpQ0TKTeBOnl4zESVzE7SVAEAyVyVYUlknoPbprmX466mBXBXMVfZBRFo-YOU8UpbRxQoyJuXaXLhjiYwGQjh2aOLN57kMHMChUabhWrE-6-llW2UJVppJVk4pVJkSLOXcp2KZYWA+CLTULeBkIzrKn3HxUlknjoTDD9BBwdjDBdg9hCBOFNxrDD5SmdxV4EznBRCThPArRfmQY6k1XkkhV1UjUhi9A8CIj9BCCVCSACBTUzWqhzWqVeoqQ+qSmj4rUx4MSHJzoeHKQyyJAmRygACqjQzAhQwwqAZQkAmmeoj1X8FRpmRkBW8slCH4Tu5wDp6Yy4Tg9I4lkGQNINjQdA6meAzkYS-Awg6orYcgThcQNeI4bIoljC6YOYMm9aakCRC45RVgANwNkoxNpNWAjQEAQ6Ig4gaoyo4weCqVZuC40szgCQI4J2dZ4mqNbodsKcyUJEzZvleNvNPA-NjkQtQ65NkYQgEt4F0tSwDgu88takbGU+5MLNvghy4epYmM1wZwPNIN+tOgAtfAbApQII-EUAC5bxXB1tctJYdtStXIKtxwlw+Y4eKkvgriPgXtfNvtjkwwKCFWwduFUtLVhmdgFxRIHgsi7gpYTtUCTIDONmp2SQxJLENAAFcABg-IltiAAAtMpDmN3Q6HsAPYPQPU4EVh3ScCjccCSJcFNmRMdmtQtiwOwJwGAGPeOMav8crjcHEJcNyLuRZQwWPVSCzesBcVEKQskG7bjdVentUPUE0C0G0GPRyF4Loc6BbHHD4J4aYMkqakhXSAzQTDrdfdSlKGPbHrEeOT4LYuYH+rSHbRcGaMSMuNsHsDtcA1elBKvohAwGAwxCvG4oZMkjRaMd-dpMuN9OyJmaWG2bxNg0UGPRYMpDpBOZuTcD9L4JpDquQ+bl4D9AZNzSSZZVgN1Aw1yBfgxFyHSKcESZw+ENwzEGEPw+0XtAdEdDVAwwTC4EyL9S3E4NyXHd-ZjNDnlsohXUwn5WCV1ODBfDwIpcgBo9XXYPEHYBbJEOuOlCfUtMpNlNNgIxYwKVZBEe2CI4XWNFTLeeONmXbXSAYycJbNLOrpjArXg3yfvbqVBCE4uRIqNotE4PlWw2GdibSDyeRdcEVVpHlO0SXHAOXJk2HZTuuHlDpIzQVWcKomcfED3MXr6hcoI6VZgdgRXE-dyBfjPsbFOqY3OI8N+HvFAv9HSDjO0XimUugk-CCLg-EqZnEFpJNs4ETNPSGqpEkKXlAks7SnouUhgk-WpJ9OutNnlIlO+PClpOaGGkSLmd46k9FTVb4v4oEgQCEivaExyoqUyEkJowxL4DZvLs84inZskmU42UYX07qcs4sgYofeTApChW9FSBAVpFQo4gk8gztljbRbtT+enmi38tcx4ApPSL0lSCyAzvs26DllcIZG3GhSizVdKg8rKvKtdUqgIE-QkIKnkwouuM6bE1KyIWTKyJjQo1fUiTVXag6k6hAPAMC43CM6SGM4AgyMuETO84c20-sDjDZu0TmksWAzc7kw8HEFAumBbMa+YKazEOa7sGgyq+ngRpPP2oOkC1k7JO+SbL6gwkkObPblRskusNue4AxByO0XkXeiefQ9q-UX+NLPEJG3+O-e4w4u4hcN4PqixuU+0VxjxvYxmycOzZNL4XsHlPLTCyEA7lZgxL-O7dOTy+ntpqpsphgKIzjHq79UhY0zWezpYDAXlBHlcOKj29Sv-u5s8p5sFNcwtAkIkA4COMkMSFAc+TASWM4GyMWGc29q1hVp9ncvYMM1SGC3m1Qyxi2wgAVYdiWHROzn4xS-RVektitra89RTCzh4JvLAy+xOpfu+5aHLGe1dhe7dnSmPcoli9LgaumO4DWYQWkQ4H0po3NhWwQOjo-Ihkh9udYK47KTjBIZDo8Nh7K3h+TO0SBZnpVvrkG-U+Ck7HbBuC7MlDLGuJDm3CGlPr1emF++g0Ul7lnmx4bk-emLqukQBsovEFRJI9YOrh26WHQu0e3p3t3rGsMw9OvDtorTsCQycHRIuOug8JA4m+SxJyPMx6vgQOvl0cHem8G2E6cqSAogascn+FRNbreaY8kE2aJe0UuzezW8SESFykCeTE8EAtoVo4e8CSe9sLccwQRgM5PAw3sErtsKpOTDA1y8zhBws1B5+zQzIbenYUhKIyWItDQeinPr4GByuBcOQk4OHt8cqyVbqToGYRYWszV3IXV1AGA6QkyKvGZwTGEDR4BrQiBlI-mQu7kVl+gaEQ4xfiWLNK4wTM+1h6IfR5mIx2tzhjYam4UWwEhxYGG5sBG+8xPfUbR8d7h6d-Zz69Sp0Xeho8+QrGTLXtyUU+B1ZwyP9OQ+ruJ191elsY8bg3S3EDjKpLYBTI8GcSTACQsykk8INRSTazW4wylyw3HAUxw8nIkFo1j8p3lNcBF3FqI3S3RPsBbNNskGcF3HbNw6dkeyCf40IwdUsQItt2mM47Ym48+yDucHafsPl3aebu0UKbmvmk-Qy6-bmebpaPELEyDilzO1bhfe-W6aqaES+gj2sJEN8Z4MeyD4lPEmOWRHqqtG6Vq552brEMT2tKT2EOTzidyJYA75I+4OuJGdGY-EwOVQ14BqBqctvdRdyHOJjLvLLG9AxEkq4NV-JU-RPvxxy8TKcqyInzobYFzkSI08kDOXOZi+rcksSFp5jQTJLBOg70g-OH12kzVRhcNYO9F6yHbNnKcmJ4as9ycPdNLE3AcjEPRMVR3+nl3-JWs0-SsOlKRM4sSBbF4GAtD-1zVYxTZaedhXY4fTwavGcBYMnZaLE3ENcPbPaGuDcPcO0dJbJd36xdDB5xx4+Aoj56cn5wiwF9lR-jIMxW8QHlHvW+bp5rK3fWlt+Gsxl9YcZwZ9qcEFTkMI8ffZxu0Viov8s+NbT9vS1iCWgEBXIUitsFKZmcx2GHdohHyOo983ejcWONjG5CJwEc9NOcOOh0j69XEuwAeOdxHiC8cBdAkINyEXB5hKe5rK4D9HcpaNogJ2GWCpAoressg+NMBiPyn5aMxyLoAvvEHTpMAwaENCAJAFXqZY0aacMLEy1cDb9sA+NQWkTUzpj10eqNOOCIPZq14JBGwdOj7RJrscwUX-L+ggCxqWBkmDIeIHAQ8EG1BawtbwZqliTL9UaCtPVmpCUjmAVI5jXWt7XCH+1A6wdMetTgQZsZyYDwHhs+0uBYwFaMQdMAkSAaVhrBnggWtnTLi516uNbXIXHHyHqQihLNEcIBnP7KInog-ARmkCAA */
    id: "root",
    type: "parallel",
    states: {
      DialogueManager: {
        initial: "Prepare",
        states: {
          Prepare: {
            on: { ASRTTS_READY: "Ready" },
            entry: [
              ({ context })=> {
                const recommendationButton = document.getElementById("recommendationButton");
                recommendationButton.style.display ="none";
                const get_artists_name_ask = document.getElementById("get_artists_name_ask");
                get_artists_name_ask.style.display = "none";
                const my_songs = document.getElementById("my_songs");
                my_songs.style.display = "none";
                const create_playlist = document.getElementById("create_playlist");
                create_playlist.style.display = "none";
                const find_singer = document.getElementById("find_singer");
                find_singer.style.display = "none";
                const playlist_container = document.getElementById("playlist_container");
                playlist_container.style.display = "none";
                const erase_playlist = document.getElementById("erase_playlist");
                erase_playlist.style.display = "none";
                const messageContainer = document.getElementById("message-container");
                messageContainer.style.display = "none";
                const songplayback_container = document.getElementById("songplayback_container");
                songplayback_container.style.display = "none";
                const reconnect = document.getElementById("reconnect");
                reconnect.style.display = "none";
                const another_playlist = document.getElementById("another_playlist");
                another_playlist.style.display = "none";


              },
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
                entry: 
                  say("Hi! How can I help you today?"),
                on: { SPEAK_COMPLETE: "Ask" },
              },
              Ask:{
                entry: ({ context }) => {
                  const recommendationButton = document.getElementById("recommendationButton");
                  recommendationButton.style.display ="block";
                  const get_artists_name_ask = document.getElementById("get_artists_name_ask");
                  get_artists_name_ask.style.display = "block";
                  const my_songs = document.getElementById("my_songs");
                  my_songs.style.display = "block";
                  const create_playlist = document.getElementById("create_playlist");
                  create_playlist.style.display = "block";
                  const find_singer = document.getElementById("find_singer");
                  find_singer.style.display = "block";
                  const playlist_container = document.getElementById("playlist_container");
                  playlist_container.style.display = "none";
                  const erase_playlist = document.getElementById("erase_playlist");
                  erase_playlist.style.display = "none";
                  const messageContainer = document.getElementById("message-container");
                  messageContainer.style.display = "none";
                  const another_playlist = document.getElementById("another_playlist");
                  another_playlist.style.display = "none";



                },
                on: {
                  CLICK_RECOMMENDATION: {target: "Recommendation"},
                  CLICK_GET_ARTISTS_NAME_ASK: {target: "get_artists_name_ask"},
                  CLICK_MY_SONGS: {target: "my_songs"},
                  CLICK_CREATE_PLAYLIST: {target: "Playlist"},
                  CLICK_FIND_ARTIST: {target: "Ask_for_singer"},
                },
              }, //done
              Ask_for_singer: {
                entry: [
                  ({ context }) => {
                    const recommendationButton = document.getElementById("recommendationButton");
                    recommendationButton.style.display ="none";
                    const get_artists_name_ask = document.getElementById("get_artists_name_ask");
                    get_artists_name_ask.style.display = "none";
                    const my_songs = document.getElementById("my_songs");
                    my_songs.style.display = "none";
                    const create_playlist = document.getElementById("create_playlist");
                    create_playlist.style.display = "none";
                    const find_singer = document.getElementById("find_singer");
                    find_singer.style.display = "none";
                    const another_playlist = document.getElementById("another_playlist");
                    another_playlist.style.display = "none";
                  },
                  say("Is there someone specific you're interested in?"),
                ],
                on: {SPEAK_COMPLETE: "Ask_singer"},
              }, //done
              Ask_singer: {
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
              },//done
              CHAT: {
                invoke: {
                  src: fromPromise(async({ input })=> {
                    const data = await fetchFromChatGPT("Can you tell me who" + input.lastResult[0].utterance + "is", 60);
                    console.log("CHAT_data:",data)
                    return data;
                  }),
                  input: ({ context, event}) => ({
                    lastResult: context.lastResult,
                  }),
                  onDone: {
                    target: "Chat_Answer",
                    actions: [
                      assign({
                        artist_JSON: ({ event }) => event.output,
                      }),
                    ],
                  },
                  onError: {
                    target: "GPT_Error",
                  },
                },
              }, //done
              GPT_Error: {
                entry: ({ context}) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `The system has run into an error, please wait until the application has been reloaded`},
                  });
                },
                on: {SPEAK_COMPLETE: "#root"},
              }, //done
              Chat_Answer: {
                entry: ({ context}) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `${context.artist_JSON}`},
                  });
                },
                on: {SPEAK_COMPLETE: "COMPLETE_CHAT"},
              }, //done
              COMPLETE_CHAT: {
                entry: say("Is there anything else you would like to know?"),
                on: {SPEAK_COMPLETE: "Ask_CHAT"},
              }, //done
              Ask_CHAT:{
                entry: listen(),
                on: {
                  RECOGNISED:[
                  {
                    target: "Question_CHAT",
                    guard: ({ event }) => {
                      const utterance = event.value[0].utterance;
                      const spotifyEntity = ToLowerCase(utterance, "yes");
                      return spotifyEntity;
                    },
                  },
                  {
                    target: "Finish_CHAT",
                    guard: ({ event }) => {
                      const utterance = event.value[0].utterance;
                      const spotifyEntity = ToLowerCase(utterance, "no");
                      return spotifyEntity;
                    },
                  },
                ],
                },
              }, //done
              Question_CHAT: {
                entry: say("Ok. What else would you like to do?"),
                on: {SPEAK_COMPLETE: "Ask"},
              },//done
              Finish_CHAT: {
                entry: say("Ok. I was glad to assist you. Have a nice day!"),
                on: {SPEAK_COMPLETE: "#root"},
              }, //done
              get_artists_name_ask:{
                entry: [
                  ({context }) => {
                    const recommendationButton = document.getElementById("recommendationButton");
                    recommendationButton.style.display ="none";
                    const get_artists_name_ask = document.getElementById("get_artists_name_ask");
                    get_artists_name_ask.style.display = "none";
                    const my_songs = document.getElementById("my_songs");
                    my_songs.style.display = "none";
                    const create_playlist = document.getElementById("create_playlist");
                    create_playlist.style.display = "none";
                    const find_singer = document.getElementById("find_singer");
                    find_singer.style.display = "none";
                    const another_playlist = document.getElementById("another_playlist");
                    another_playlist.style.display = "none";
                  },
                  say("Who would you like to listen to?"),
              ],
                on: {SPEAK_COMPLETE: "get_artists_name_2"},
              }, //done
              get_artists_name_2:{
                entry: listen(),
                on: {
                  RECOGNISED: [
                    {
                      target: "get_artists_name",
                      guard: ({ event }) => {
                        const utterance = event.value[0].utterance;
                        const spotifyEntity = ToLowerCase(utterance, "artist_play");
                        return spotifyEntity;
                      },
                      actions: [
                        ({ event }) => console.log(event),
                        assign({
                          lastResult: ({ event }) => event.value,
                        }),
                      ],
                    },
                    {
                      target: "full_stop",
                      guard: ({ event }) => {
                        const utterance = event.value[0].utterance;
                        const spotifyEntity = ToLowerCase(utterance, "no");
                        return spotifyEntity;
                      },
                      actions: [
                        ({ event }) => console.log(event),
                        assign({
                          lastResult: ({ event }) => event.value,
                        }),
                      ],
                    },
                    {
                      target: "unreachable",
                      guard: ({ event}) => {
                        const utterance = event.value[0].utterance;
                        const grammar = event.value.grammar;
                        const result = utterance !== grammar;
                        return result
                      }
                    }
                  ],
                },
              }, //done
              unreachable: {
                entry: [
                  ({context }) => {
                    const recommendationButton = document.getElementById("recommendationButton");
                    recommendationButton.style.display ="none";
                    const get_artists_name_ask = document.getElementById("get_artists_name_ask");
                    get_artists_name_ask.style.display = "none";
                    const my_songs = document.getElementById("my_songs");
                    my_songs.style.display = "none";
                    const create_playlist = document.getElementById("create_playlist");
                    create_playlist.style.display = "none";
                    const find_singer = document.getElementById("find_singer");
                    find_singer.style.display = "none";
                    const another_playlist = document.getElementById("another_playlist");
                    another_playlist.style.display = "none";
                  },
                  say("I am sorry, but I didn't get that. Could you repeat the name or ask for someone else?"),
              ],
                on: {SPEAK_COMPLETE: "get_artists_name_2"},
              },
              get_artists_name: {
                entry: [
                  assign({
                    artist_first_name: ({ context }) => {
                      const userUtterance = context.lastResult[0].utterance;
                      const words = userUtterance.split(' ');
                      let first_name = ' ';
              
                      if (words.length >= 0) {
                        const index = words.indexOf('by');
              
                        if (index !== -1 && index < words.length - 2) {
                          const artistName = words.slice(index + 1).join(' ');
                          const artistNameParts = artistName.split(' ');
              
                          if (artistNameParts.length >= 2) {
                            first_name = artistNameParts[0];
                          }
                        }
                      }
              
                      return first_name;
                    },
                    artist_last_name: ({ context }) => {
                      const userUtterance = context.lastResult[0].utterance;
                      const words = userUtterance.split(' ');
                      let last_name = '';
              
                      if (words.length >= 0) {
                        const index = words.indexOf('by');
              
                        if (index !== -1 && index < words.length - 2) {
                          const artistName = words.slice(index + 1).join(' ');
                          const artistNameParts = artistName.split(' ');
              
                          if (artistNameParts.length >= 2) {
                            last_name = artistNameParts.slice(1).join(' ').replace('?', '');
                          }
                        }
                      }
              
                      return last_name;
                    },
                  }),
                  ({ context }) => {
                    console.log("First Name:", context.artist_first_name);
                    console.log("Last Name:", context.artist_last_name);
              
                    context.spstRef.send({
                      type: "SPEAK",
                      value: { utterance: `Okay, working on that` },
                    });
                  },
                ],
                onDone: {
                  target: "get_artist_id",
                },
                on: {
                  SPEAK_COMPLETE: "get_artist_id",
                },
              }, //done            
              get_artist_id: {
                invoke: {
                  input: ({ context, event }) => ({
                    first_name: context.artist_first_name,
                    last_name: context.artist_last_name,
                    lastResult: context.lastResult,
                  }),
                  src: fromPromise(async ({ input }) => {
                    const token = spoty;
              
                    async function fetchArtistId() {
                      const res = await fetch(`https://api.spotify.com/v1/search?q=artist%3A${input.first_name}%25${input.last_name}&type=artist`, {
                        method: 'GET',
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      });
                      return await res.json();
                    }
                    try {
                      const data = await fetchArtistId();
                      console.log("Artist id data", data);
                      return data;
                    } catch (error) {
                      console.log("Error", error);
                      throw error;
                    }
                  }),
                  onDone: {
                    target: 'tracks_ids',
                    actions: [
                      assign({
                        Artist_id_JSON: ({ event }) => event.output,
                      }),
                    ],
                  },
                  onError: {
                    target: "artist_id_API_ERROR",
                  },
                },
              }, //done
              artist_id_API_ERROR:{
                entry: ({ context}) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `The system has run into an error, please wait until the application has been reloaded`},
                  });
                },
                on: {SPEAK_COMPLETE: "get_artists_name_ask"},
              }, //done
              tracks_ids: {
                entry: ({ context}) => {
                  console.log("Artist's ID:", context.Artist_id_JSON.artists.items[0].id);
                  const artist = context.Artist_id_JSON.artists.items[0].id;
                  context.artist = artist;
                  context.spstRef.send({
                    type: "SPEAK",
                    value: { utterance: `Stand by`},
                  });
                },
                on: {SPEAK_COMPLETE: "top_songs"},
              }, //done
              top_songs: {
                invoke: {
                  input: ({ context, event }) => ({
                    id: context.artist,
                    lastResult: context.lastResult,
                  }),
                  src: fromPromise(async ({ input }) => {
                    const token = spoty;
                    
                    async function fetchSongs() {
                      const response = await fetch(`https://api.spotify.com/v1/artists/${input.id}/albums?market=US`, {
                        method: 'GET',
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      });
                      return await response.json();
                    }
                    try {
                      const data = await fetchSongs();
                      return data;
                    }catch (err) {
                      throw err;
                    }
                  }),
                  onDone: {
                    target: "song_shuffle",
                    actions: [
                      assign({
                        Artist_songs: ({ event}) => event.output,
                      }),
                    ],
                  },
                },
              }, //done
              song_shuffle: {
                entry: ({ context}) => {
                  const reconnect = document.getElementById("reconnect");
                  reconnect.style.display = "none";
                  console.log("Albums", context.Artist_songs)
                  const songIDs = context.Artist_songs.items.map(album => album.id);
                  console.log("Album's IDs:", songIDs);
                  const getRandom = (min,max) => {
                    return Math.floor(Math.random() *(max-min +2));
                  };

                  const randomIndex = getRandom(0, songIDs.length-1);
                  const selectedID = songIDs[randomIndex];
                  console.log("Selected ID:", selectedID);

                  context.selectedID = selectedID;
              
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {utterance: `Done`},
                  });
                },
                on: {SPEAK_COMPLETE: "random_song_player"},
              }, //done
              random_song_player: {
                invoke: {
                  input: ({ context, event }) => ({
                    song: context.selectedID,
                    lastResult: context.lastResult,
                  }),
                  src: fromPromise(async ({ input }) => {
                    const token = spoty;
                    const playRequest = {
                      context_uri: `spotify:album:${input.song}`,
                      offset: {
                        position: 0,
                      },
                      position_ms: 0,
                    };
                    const apiUrl = 'https://api.spotify.com/v1/me/player/play';
                    try {
                      const respose =  await fetch (apiUrl, {
                        method: 'PUT',
                        headers: {
                          Authorization: `Bearer ${token}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(playRequest),
                      });
                      if (!respose.ok) {
                        throw new Error('Failed');
                      }
                    } catch (err) {
                      console.error(err);
                      throw err;
                    }
                  }),
                  onDone: {
                    target: "wait_one_sec",
                  },
                  onError: {
                    target: "player_error",
                  },
                },
              }, //done
              player_error: {
                entry: ({ context}) => {
                  console.log(context.current_artist_JSON);
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {utterance: `I've run into some problems and couldn't connect to your spotify. Check that you have an active device or you token hasn't expired and press reconnect`},
                  });
                },
                on: {SPEAK_COMPLETE: "reconnect"},
              }, //done
              reconnect: {
                entry: ({ context }) => {
                  const reconnect = document.getElementById("reconnect");
                  reconnect.style.display = "block";
                },
                on: {
                  CLICK_reconnect: {target: "song_shuffle"},
                },
              },
              wait_one_sec: {
                after: {
                  1000: {
                    target: "get_current_artist_1",
                  },
                },
              },
              get_current_artist_1: {
                invoke: {
                  src: fromPromise(async ({ input }) => {
                    
                    const accessToken = spoty;
                    const apiUrl = 'https://api.spotify.com/v1/me/player/currently-playing';
              
                    try {
                      const response = await fetch(apiUrl, {
                        method: 'GET',
                        headers: {
                          Authorization: `Bearer ${accessToken}`,
                          'Content-Type': 'application/json',
                        },
                      });
              
                      if (!response.ok) {
                        throw new Error('Failed to fetch the current artist information');
                      }
              
                      const data = await response.json();
                      console.log('Current Artist Data:', data);
                      return data;
                      
                    } catch (error) {
                      console.log('Error:', error);
                      throw error;
                    }
                  }),
                  input: ({ context, event }) => ({
                    lastResult: context.lastResult,
                  }),
                  onDone: {
                    target: "song_data",
                    actions: [
                      assign({
                        current_artist_JSON: ({event }) => event.output, 
                      }),
                    ],
                  },
                },
              }, //done
              song_data: {
                entry: ({ context }) => {
                  const songplayback_container = document.getElementById("songplayback_container");
                  songplayback_container.style.display = "block";
                  console.log('current_artist_JSON:', context.current_artist_JSON);
                  
                  const oneSong = context.current_artist_JSON?.item;
              
                
                  if (oneSong) {
                    const imageUrl = oneSong.album.images[2].url;
                    const songName = `${oneSong.name} `;
                    const songArtist =`${oneSong.artists[0].name}`;
  
                    
                    
                    const imageElement = document.createElement("img");
                    imageElement.src = imageUrl;
                    songplayback_container.appendChild(imageElement);
              
                    
                    const songElement = document.createElement("p");
                    songElement.textContent = songName;
                    songplayback_container.appendChild(songElement);

                    const songElement_2 = document.createElement("q");
                    songElement_2.textContent = songArtist;
                    songplayback_container?.appendChild(songElement_2)
  
                    context.spstRef.send({
                      type: "SPEAK",
                      value: { utterance: `Playing ${songName} by ${songArtist}`},
                    });
                  } 
                },
                on: {SPEAK_COMPLETE: "wait_1"},
              }, //done
              get_current_artist: {
                invoke: {
                  src: fromPromise(async ({ input }) => {
                    
                    const accessToken = spoty;
                    const apiUrl = 'https://api.spotify.com/v1/me/player/currently-playing';
              
                    try {
                      const response = await fetch(apiUrl, {
                        method: 'GET',
                        headers: {
                          Authorization: `Bearer ${accessToken}`,
                          'Content-Type': 'application/json',
                        },
                      });
              
                      if (!response.ok) {
                        throw new Error('Failed to fetch the current artist information');
                      }
              
                      const data = await response.json();
                      console.log('Data:', data);
                      return data;
                      
                    } catch (error) {
                      console.log('Error:', error);
                      throw error;
                    }
                  }),
                  input: ({ context, event }) => ({
                    lastResult: context.lastResult,
                  }),
                  onDone: {
                    target: "pause_player",
                    actions: [
                      assign({
                        current_artist_JSON: ({event }) => event.output, 
                      }),
                    ],
                  },
                },
              }, //done
              pause_player: {
                invoke: {
                  src: fromPromise(async ({ input }) => {
                    const token = spoty;
                    const apiUrl = 'https://api.spotify.com/v1/me/player/pause';
                    try {
                      const respose =  await fetch (apiUrl, {
                        method: 'PUT',
                        headers: {
                          Authorization: `Bearer ${token}`,
                          'Content-Type': 'application/json',
                        },
                      });
                      if (!respose.ok) {
                        throw new Error('Failed');
                      }
                    } catch (err) {
                      console.error(err);
                      throw err;
                    }
                  }),
                  onDone: {
                    target: "ask_continue",
                  },
                },
              }, //done
              ask_continue: {
                entry: ({ context}) => {
                  const songplayback_container = document.getElementById('songplayback_container');
                  songplayback_container.style.display = 'none';
                  function clearSongPlaybackContainer() {
                    while (songplayback_container.firstChild) {
                      songplayback_container.removeChild(songplayback_container.firstChild);
                    }
                  }
                  clearSongPlaybackContainer(); 
                  console.log(context.current_artist_JSON);
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {utterance: `Would you like to continue listening to "${context.current_artist_JSON.item.name}" by ${context.current_artist_JSON.item.artists[0].name}?`},
                  });
                },
                on: {SPEAK_COMPLETE: "Ask_continue_1"},
              }, //done
              Ask_continue_1:{
                entry: listen(),
                on: {
                  RECOGNISED:[
                  {
                    target: "random_song_player",
                    guard: ({ event }) => {
                      const utterance = event.value[0].utterance;
                      const spotifyEntity = ToLowerCase(utterance, "yes");
                      return spotifyEntity;
                    },
                  },
                  {
                    target: "ask_for_a_new_singer",
                    guard: ({ event }) => {
                      const utterance = event.value[0].utterance;
                      const spotifyEntity = ToLowerCase(utterance, "no");
                      return spotifyEntity;
                    },
                  },
                  {
                    target: "full_stop",
                    guard: ({ event })=> {
                      const utterance = event.value[0].utterance;
                      const spotifyEntity = ToLowerCase(utterance, "full_stop");
                      return spotifyEntity;
                    },
                  },
                ],
                },
              }, //done
              full_stop:{
                entry: ({ context}) => {
                  const songplayback_container = document.getElementById("songplayback_container");
                  songplayback_container.style.display = "none";
                  const another_playlist = document.getElementById("another_playlist");
                  another_playlist.style.display = "none";

                  function clearSongPlaybackContainer() {
                    while (songplayback_container.firstChild) {
                      songplayback_container.removeChild(songplayback_container.firstChild);
                    }
                  }
                  clearSongPlaybackContainer(); 
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {utterance: `Sure! No problem. You have quite a taste, I must say! If you wish me to do something else for you then just press one of the buttons on the screen!`},
                  });
                },
                on: {SPEAK_COMPLETE: "Ask"},
              }, //done
              ask_for_a_new_singer:{
                entry: ({ context}) => {
                  const songplayback_container = document.getElementById("songplayback_container");
                  songplayback_container.style.display = "none";

                  const another_playlist = document.getElementById("another_playlist");
                  another_playlist.style.display = "none";
                  function clearSongPlaybackContainer() {
                    while (songplayback_container.firstChild) {
                      songplayback_container.removeChild(songplayback_container.firstChild);
                    }
                  }
                  clearSongPlaybackContainer(); 
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {utterance: `Is there someone else you would like to listen to?`},
                  });
                },
                on: {SPEAK_COMPLETE: "get_artists_name_2"},
              },//done
              wait_1: {
                after: {
                  6000: {
                    target: "Random_song_Finish",
                  },
                },
              },//done
              Random_song_Finish: {
                entry: ({ context}) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {utterance: `Do you like this song?`},
                  });
                },
                on: {SPEAK_COMPLETE: "Ask_Random_Song"},
              }, //done
              Ask_Random_Song: {
                entry: 
                  listen(),
                on: {
                  RECOGNISED:[
                  {
                    target: "random_song_end",
                    guard: ({ event }) => {
                      const utterance = event.value[0].utterance;
                      const spotifyEntity = ToLowerCase(utterance, "yes");
                      return spotifyEntity;
                    },
                  },
                  {
                    target: "new_song",
                    guard: ({ event }) => {
                      const utterance = event.value[0].utterance;
                      const spotifyEntity = ToLowerCase(utterance, "no");
                      return spotifyEntity;
                    },
                  },
                  {
                    target: "ask_for_a_new_singer",
                    guard: ({ event }) => {
                      const utterance = event.value[0].utterance;
                      const spotifyEntity = ToLowerCase(utterance, "full_stop");
                      return spotifyEntity;
                    },
                  },
                ],
                },
              
              }, // TODO: timer
              time_out_ask_Random_Song: {
                entry: ({ context}) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {utterance: `I didn't hear you. Could you repeat?`},
                  });
                },
                on: {SPEAK_COMPLETE: "Ask_Random_Song"},
              }, //TODO: timer
              random_song_end: {
                entry: ({ context}) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {utterance: `Great! I'll keep this one on!`},
                  });
                },
                on: {SPEAK_COMPLETE: "random_song_stop"},
              }, //done
              random_song_stop: {
                entry: listen(),
                on: {
                  RECOGNISED: [
                    {
                      target: "get_current_artist",
                      guard: ({ event }) => {
                        const utterance = event.value[0].utterance;
                        const spotifyEntry = ToLowerCase(utterance, "stop");
                        return spotifyEntry;
                      },
                      actions: [
                        ({ event }) => console.log(event),
                        assign({
                          lastResult: ({ event}) => event.value,
                        }),
                      ],
                    },
                ],
                },
              }, //done
              new_song: {
                entry: ({ context}) => {
                  const songplayback_container = document.getElementById("songplayback_container");
                  songplayback_container.style.display = "none";
                  const another_playlist = document.getElementById("another_playlist");
                  another_playlist.style.display = "none";

                  function clearSongPlaybackContainer() {
                    while (songplayback_container.firstChild) {
                      songplayback_container.removeChild(songplayback_container.firstChild);
                    }
                  }
                  clearSongPlaybackContainer();                  
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {utterance: `No problem. I'll play something else!`},
                  });
                },
                on: {SPEAK_COMPLETE: "song_shuffle"},
              }, //done
              my_songs: {
                entry: ({ context }) => {
                  const recommendationButton = document.getElementById("recommendationButton");
                  recommendationButton.style.display ="none";
                  const get_artists_name_ask = document.getElementById("get_artists_name_ask");
                  get_artists_name_ask.style.display = "none";
                  const my_songs = document.getElementById("my_songs");
                  my_songs.style.display = "none";
                  const create_playlist = document.getElementById("create_playlist");
                  create_playlist.style.display = "none";
                  const find_singer = document.getElementById("find_singer");
                  find_singer.style.display = "none";
                  const another_playlist = document.getElementById("another_playlist");
                  another_playlist.style.display = "none";
                },
                invoke: {
                  src: fromPromise(async ({ input }) => {
                    
                    const accessToken = spoty;
                    const apiUrl = 'https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=50';
              
                    try {
                      const response = await fetch(apiUrl, {
                        method: 'GET',
                        headers: {
                          Authorization: `Bearer ${accessToken}`,
                          'Content-Type': 'application/json',
                        },
                      });
              
                      if (!response.ok) {
                        throw new Error('Failed to fetch top tracks from Spotify API');
                      }
              
                      const data = await response.json();
                      console.log('Data:', data);
                      return data;
                      
                    } catch (error) {
                      console.log('Error:', error);
                      throw error;
                    }
                  }),
                  input: ({ context, event }) => ({
                    lastResult: context.lastResult,
                  }),
                  onDone: {
                    target: "Reply_songs",
                    actions: [
                      assign({
                        topSongs_JSON: ({event }) => event.output, // Store the Spotify API response in topSongs_JSON
                      }),
                    ],
                  },
                 
                },
              }, //done
              Reply_songs: { 
                entry: ({ context}) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {utterance: `Okay, Let's take a look at what we're having here...
                    Oh wow, I see you're a fan of ${context.topSongs_JSON.items[0].artists[0].name} and ${context.topSongs_JSON.items[19].artists[0].name}. Let me think for a second...`},
                  });
                },
                on: {SPEAK_COMPLETE: "wait"},
              }, //done
              wait: {
                after: {
                  3000: {
                    target: "Reply_songs_2",
                  },
                },
              }, //done
              Reply_songs_2:{
                entry: say("Okay, I have gone through your account and I'm ready to share your stats!"),
                on: {SPEAK_COMPLETE: "Top_songs"},
              }, //done
              Top_songs: {
                entry: ({ context }) => {
                  const messageContainer = document.getElementById("message-container");
                  messageContainer.style.display = "block";
                  const another_playlist = document.getElementById("another_playlist");
                  another_playlist.style.display = "none";
                  console.log('topSongs_JSON:', context.topSongs_JSON);
                  const topSongs = context.topSongs_JSON?.items;
                  console.log('Top 5 songs', topSongs);
                  function clearSongPlaybackContainer() {
                    while (messageContainer.firstChild) {
                      messageContainer.removeChild(messageContainer.firstChild);
                    }
                  }
                  clearSongPlaybackContainer();
              
                  if (topSongs && topSongs.length > 0) {
                    const top5Songs = topSongs.slice(20,25);
                      const message = ` TOP 5 :\n\n${top5Songs
                        .map((song, index) => {
                          const imageUrl = song.album.images[2].url; // Access the URL of the first image in the images array
                          const songInfo = `${index + 1}. ${song.name} by ${song.artists.map((artist) => artist.name).join(', ')}`;
                          
                          if (imageUrl) {
                            // If there is an image URL, create an <img> element
                            return `${songInfo}\n <img src="${imageUrl}"/>`;
                          } else {
                            return songInfo;
                          }
                        })
                        .join('\n\n')}`;

                      // Get the message container element
                      const messageContainer = document.getElementById("message-container");
                      const squareContainer = document.getElementById("square-container");
                      const button = document.getElementById("button");

                      const introTextElement = document.createElement("p");
                      introTextElement.textContent = "TOP 5 :";
                      introTextElement.classList.add("intro-text"); // Add the intro-text class
                      
                
                      // Append the introductory text to the message container
                      messageContainer.appendChild(introTextElement);
                
                      // Split the message into lines (excluding the introductory text) and add them to the message container with a delay
                      function displayLines(linesArray, index) {
                        if (index < linesArray.length) {
                          const line = linesArray[index];
                          const lineElement = document.createElement("p");
                          lineElement.innerHTML = line; // Use innerHTML to include the <img> element
                
                          // Create a song rectangle for each line
                          const songRectangle = document.createElement("div");
                          songRectangle.className = "song";
                          songRectangle.innerHTML = line;
                          
                          
                          messageContainer.appendChild(songRectangle);
                          
                
                          setTimeout(() => {
                            // After adding a line, adjust the square container's height to fit the content
                            squareContainer.style.minHeight = `${messageContainer.clientHeight + button.clientHeight + 40}px`; // Add extra padding
                            displayLines(linesArray, index + 1);
                          }, 4000); // Adjust the delay (in milliseconds) between each line
                        }
                      }
                
                      // Start displaying lines with a delay, excluding the first line (introductory text)
                      displayLines(message.split('\n\n').slice(1), 0);

                      

                      context.spstRef.send({
                        type: "SPEAK",
                        value: { utterance: message },
                      });

                    } else {
                      context.spstRef.send({
                        type: "SPEAK",
                        value: { utterance: "I couldn't find your top songs on Spotify. Please try again later." },
                      });
                    }
                  },
                  on: { SPEAK_COMPLETE: "Ask" },
              }, //done
              Recommendation: {
                entry: ({ context }) => {
                  const recommendationButton = document.getElementById("recommendationButton");
                  recommendationButton.style.display ="none";
                  const get_artists_name_ask = document.getElementById("get_artists_name_ask");
                  get_artists_name_ask.style.display = "none";
                  const my_songs = document.getElementById("my_songs");
                  my_songs.style.display = "none";
                  const create_playlist = document.getElementById("create_playlist");
                  create_playlist.style.display = "none";
                  const find_singer = document.getElementById("find_singer");
                  find_singer.style.display = "none";
                  const another_playlist = document.getElementById("another_playlist");
                  another_playlist.style.display = "none";
                },
                invoke: {
                  src: fromPromise(async ({ input }) => {
                    const token = spoty; // Replace with your Spotify access token
                    const topTracksIds = [
                      '6DdBrebXDXdTkN0Zb64O6p',
                      '7cqlE9HPKAPpszcj5qlsqc',
                      '6mlht8uraBsyvWMLMVaU2G',
                      '58VF5ob7qRB3yUzOYEAhyf',
                      '4xQ6weGXjibzUUGs8BR0dh',
                    ];
              
                    
                    async function fetchRecommendations() {
                      const res = await fetch(`https://api.spotify.com/v1/recommendations?limit=5&seed_tracks=${topTracksIds.join(',')}`, {
                        method: 'GET',
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      });
                      return await res.json();
                    }
              
                    try {
                      const data = await fetchRecommendations();
                      console.log('Recommendations Data:', data);
              
                      return data;
                    } catch (error) {
                      console.log('Error:', error);
                      throw error;
                    }
                  }),
                  input: ({ context, event }) => ({
                    lastResult: context.lastResult,
                  }),
                  onDone: {
                    target: "Recs",
                    actions: [
                      assign({
                        recomendations_JSON: ({ event }) => event.output, 
                      }),
                    ],
                  },
                },
              },//done
              Recs: {
                entry: ({ context }) => {
                  //const messageContainer = document.getElementById("message-container");
                  //messageContainer.style.display = "block";
                  console.log('recomendations_JSON:', context.recomendations_JSON)
                  const Song_rec = context.recomendations_JSON?.tracks;
                  console.log('Top 5 songs',Song_rec) 
                  const message = document.getElementById("message-container");
                  message.style.display = "block";

                  function clearSongPlaybackContainer() {
                    while (message.firstChild) {
                      message.removeChild(message.firstChild);
                    }
                  }
                  clearSongPlaybackContainer();
                  
                  if (Song_rec && Song_rec.length > 0) {
                    
                    const Recs = Song_rec.slice(0, 5);
              
                    
                    const message = `Here are your 5 recomendations based on what you listen to:\n\n ${Recs
                      .map((song, index) => {
                        const imageUrl = song.album.images[2].url;
                        const songInfo = `${index +1}. ${song.name} by ${song.artists.map((artist) => artist.name).join(', ')}`
                        
                        if (imageUrl) {
                          // If there is an image URL, create an <img> element
                          return `${songInfo}\n <img src="${imageUrl}"/>`;
                        } else {
                          return songInfo;
                        }
                      })
                      .join('\n\n')}`;


                      const messageContainer = document.getElementById('message-container');
                      const squareContainer = document.getElementById('square-container');
                      

                      const introTextElement = document.createElement("p");
                      introTextElement.textContent = "TOP 5 RECOMMENDATIONS:";
                      introTextElement.classList.add("intro-text_2");


                      messageContainer.appendChild(introTextElement);


                      function displayLines(linesArray, index) {
                        if (index < linesArray.length) {
                          const line = linesArray[index];
                          const lineElement = document.createElement("p");
                          lineElement.innerHTML = line;
                      
                          const songRectangle = document.createElement("div");
                          songRectangle.className = "song";
                          songRectangle.innerHTML = line;
                      
                          messageContainer.appendChild(songRectangle);
                      
                          setTimeout(() => {
                            squareContainer.style.minHeight = `${messageContainer.clientHeight + 40}px`;
                            displayLines(linesArray, index + 1);
                          }, 4000);
                        }
                      }
                    
                      displayLines(message.split('\n\n').slice(1),0);
              
                    
                    context.spstRef.send({
                      type: "SPEAK",
                      value: { utterance: message },
                    });
                  } else {
                    
                    context.spstRef.send({
                      type: "SPEAK",
                      value: { utterance: "I couldn't find any songs on Spotify. Please try again later." },
                    });
                  }
                },
                on: { SPEAK_COMPLETE: "Create_Playlist" },
              }, //done
              Create_Playlist: {
                entry:[
                  ({ context })=> {
                    const messageContainer = document.getElementById("message-container");
                    messageContainer.style.display = "none";
                    const another_playlist = document.getElementById("another_playlist");
                    another_playlist.style.display = "none";
                  },
                 say("Would you like to create a playlist?"),
                ],
                on: { SPEAK_COMPLETE: "Ask_playlist" },
              }, //done
              Ask_playlist: {
                entry: listen(),
                on: {

                  RECOGNISED:[
                  {
                    target: "Playlist",
                    guard: ({ event }) => {
                      const utterance = event.value[0].utterance;
                      const spotifyEntity = ToLowerCase(utterance, "yes");
                      return spotifyEntity;
                    },
                  },
                  {
                    target: "Deny",
                    guard: ({ event }) => {
                      const utterance = event.value[0].utterance;
                      const spotifyEntity = ToLowerCase(utterance, "no");
                      return spotifyEntity;
                    },
                  },
                ],
                },
              }, //done
              Deny: {
                entry: say("Okay, no playlist for you then. Is there something else you would like to do?"),
                on: {SPEAK_COMPLETE: "Ask_CHAT"},
              },//done
              mood_playlist: {
                entry: ({ context}) => {
                  const erase_playlist = document.getElementById("erase_playlist");
                  erase_playlist.style.display = "none";
                  const another_playlist = document.getElementById("another_playlist");
                  another_playlist.style.display = "none";

                  context.spstRef.send({
                    type: "SPEAK",
                    value: {utterance: `What kind of playlist would you like to create?`},
                  });
                },
                on: {SPEAK_COMPLETE: "mood_playlist_ask"},
              }, //done
              mood_playlist_ask:{
                entry: listen(),
                on: {
                  RECOGNISED:[
                  {
                    target: "sad_playlist_answer",
                    guard: ({ event }) => {
                      const utterance = event.value[0].utterance;
                      const spotifyEntity = ToLowerCase(utterance, "sad_playlist");
                      return spotifyEntity;
                    },
                  },
                  {
                    target: "happy_playlist_answer",
                    guard: ({ event }) => {
                      const utterance = event.value[0].utterance;
                      const spotifyEntity = ToLowerCase(utterance, "happy_playlist");
                      return spotifyEntity;
                    },
                  },
                ],
                },
              }, //done
              sad_playlist_answer: {
                entry: ({ context}) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {utterance: `I'm sorry to hear that. I'll pull some sad ballads for you`},
                  });
                },
                on: {SPEAK_COMPLETE: "Sad_playlist"},
              }, //done
              happy_playlist_answer: {
                entry: ({ context}) => {
                  context.spstRef.send({
                    type: "SPEAK",
                    value: {utterance: `Yay! I love parties. I'll come up with something for you!`},
                  });
                },
                on: {SPEAK_COMPLETE: "Happy_playlist"},
              }, //done
              Sad_playlist: {
                entry: ({ context}) => {
                  const recommendationButton = document.getElementById("recommendationButton");
                  recommendationButton.style.display ="none";
                  const get_artists_name_ask = document.getElementById("get_artists_name_ask");
                  get_artists_name_ask.style.display = "none";
                  const my_songs = document.getElementById("my_songs");
                  my_songs.style.display = "none";
                  const create_playlist = document.getElementById("create_playlist");
                  create_playlist.style.display = "none";
                  const find_singer = document.getElementById("find_singer");
                  find_singer.style.display = "none";
                  const playlist_container = document.getElementById("playlist_container");
                  playlist_container.style.display = "none";

                  function clearSongPlaybackContainer() {
                    while (playlist_container.firstChild) {
                      playlist_container.removeChild(playlist_container.firstChild);
                    }
                  }
                  clearSongPlaybackContainer(); 
                },
                invoke: {
                  src: fromPromise(async ({ input}) => {
                    const token = spoty;

                    async function fetchRecommendations() {
                      const res = await fetch(`https://api.spotify.com/v1/recommendations?limit=70&seed_genres=sad%2C+guitar%2C+pop%2C+acoustic&min_acousticness=0.2&max_danceability=0.4`, {
                        method: 'GET',
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      });
                      return await res.json();
                    }
                    const fetchWebApi = async(endpoint, method, body) => {
                      const res = await fetch (`https://api.spotify.com/${endpoint}`, {
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                        method,
                        body: JSON.stringify(body),
                      });
                      return await res.json();
                    };
                    async function createPlaylist(tracksUri) {
                      const {id: user_id} = await fetchWebApi('v1/me', 'GET');

                      const playlist = await fetchWebApi(
                        `v1/users/${user_id}/playlists`,
                        'POST',
                        {
                          name: 'Sad Girl Stuff',
                          description: 'Time to cry:(',
                          public: false,
                        }
                      );

                      await fetchWebApi(
                        `v1/playlists/${playlist.id}/tracks?uris=${tracksUri.join(',')}`,
                        'POST',
                        {}
                      );

                      return playlist
                    }

                    try {
                      const recomemndations = await fetchRecommendations();
                      console.log('Recommendations Data:', recomemndations); 

                      const trackUris = recomemndations.tracks.map((track) => `spotify:track:${track.id}` );
                      const createdPlaylist = await createPlaylist(trackUris);
                      console.log('Created Playlist:', createdPlaylist);
                     
                      return createdPlaylist;
                    } catch (error) {
                      console.log(error);
                      throw error;
                    }
                  }),
                  onDone: {
                    target: 'Reply_playlist',
                    actions: [
                      assign({
                        createdPlaylist_JSON: ({ event }) => event.output,
                      }),
                    ],
                  },
                },
              },
              Happy_playlist: {
                entry: ({ context}) => {
                  const recommendationButton = document.getElementById("recommendationButton");
                  recommendationButton.style.display ="none";
                  const get_artists_name_ask = document.getElementById("get_artists_name_ask");
                  get_artists_name_ask.style.display = "none";
                  const my_songs = document.getElementById("my_songs");
                  my_songs.style.display = "none";
                  const create_playlist = document.getElementById("create_playlist");
                  create_playlist.style.display = "none";
                  const find_singer = document.getElementById("find_singer");
                  find_singer.style.display = "none";

                  const playlist_container = document.getElementById("playlist_container");
                  playlist_container.style.display = "none";

                  function clearSongPlaybackContainer() {
                    while (playlist_container.firstChild) {
                      playlist_container.removeChild(playlist_container.firstChild);
                    }
                  }
                  clearSongPlaybackContainer(); 
                },
                invoke: {
                  src: fromPromise(async ({ input}) => {
                    const token = spoty;

                    async function fetchRecommendations() {
                      const res = await fetch(`https://api.spotify.com/v1/recommendations?limit=70&seed_genres=pop%2C+happy%2C+dance&max_danceability=0.8&max_instrumentalness=0.35`, {
                        method: 'GET',
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      });
                      return await res.json();
                    }
                    const fetchWebApi = async(endpoint, method, body) => {
                      const res = await fetch (`https://api.spotify.com/${endpoint}`, {
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                        method,
                        body: JSON.stringify(body),
                      });
                      return await res.json();
                    };
                    async function createPlaylist(tracksUri) {
                      const {id: user_id} = await fetchWebApi('v1/me', 'GET');

                      const playlist = await fetchWebApi(
                        `v1/users/${user_id}/playlists`,
                        'POST',
                        {
                          name: 'Dance your arsez off!',
                          description: 'It is time to partyyyyyyyy',
                          public: false,
                        }
                      );

                      await fetchWebApi(
                        `v1/playlists/${playlist.id}/tracks?uris=${tracksUri.join(',')}`,
                        'POST',
                        {}
                      );

                      return playlist
                    }

                    try {
                      const recomemndations = await fetchRecommendations();
                      console.log('Recommendations Data:', recomemndations); 

                      const trackUris = recomemndations.tracks.map((track) => `spotify:track:${track.id}` );
                      const createdPlaylist = await createPlaylist(trackUris);
                      console.log('Created Playlist:', createdPlaylist);
                     
                      return createdPlaylist;
                    } catch (error) {
                      console.log(error);
                      throw error;
                    }
                  }),
                  onDone: {
                    target: 'Reply_playlist',
                    actions: [
                      assign({
                        createdPlaylist_JSON: ({ event }) => event.output,
                      }),
                    ],
                  },
                },
              },
              Playlist: {
                entry: ({ context }) => {
                  const recommendationButton = document.getElementById("recommendationButton");
                  recommendationButton.style.display ="none";
                  const get_artists_name_ask = document.getElementById("get_artists_name_ask");
                  get_artists_name_ask.style.display = "none";
                  const my_songs = document.getElementById("my_songs");
                  my_songs.style.display = "none";
                  const create_playlist = document.getElementById("create_playlist");
                  create_playlist.style.display = "none";
                  const find_singer = document.getElementById("find_singer");
                  find_singer.style.display = "none";
                },
                invoke: {
                  src: fromPromise(async () => {
                    const token = spoty; 
                    const topTracksIds = [
                      '6DdBrebXDXdTkN0Zb64O6p',
                      '7cqlE9HPKAPpszcj5qlsqc',
                      '6mlht8uraBsyvWMLMVaU2G',
                      '58VF5ob7qRB3yUzOYEAhyf',
                      '4xQ6weGXjibzUUGs8BR0dh',
                    ];
              
                    
                    async function fetchRecommendations() {
                      const res = await fetch(`https://api.spotify.com/v1/recommendations?limit=20&seed_tracks=${topTracksIds.join(',')}`, {
                        method: 'GET',
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      });
                      return await res.json();
                    }
                    const fetchWebApi = async (endpoint, method, body) => {
                      const res = await fetch(`https://api.spotify.com/${endpoint}`, {
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                        method,
                        body: JSON.stringify(body),
                      });
                      return await res.json();
                    };
                    // Function to create a playlist
                    async function createPlaylist(tracksUri) {
                      const { id: user_id } = await fetchWebApi('v1/me', 'GET');
              
                      const playlist = await fetchWebApi(
                        `v1/users/${user_id}/playlists`,
                        'POST',
                        {
                          name: 'Dialogue Systems 2',
                          description: 'Playlist created based on your recommendations',
                          public: false,
                        }
                      );
              
                      await fetchWebApi(
                        `v1/playlists/${playlist.id}/tracks?uris=${tracksUri.join(',')}`,
                        'POST',
                        {} 
                      );
              
                      return playlist;
                    }
              
                    try {
                      const recommendations = await fetchRecommendations();
                      console.log('Recommendations Data:', recommendations);
              
                      const trackUris = recommendations.tracks.map((track) => `spotify:track:${track.id}`);
                      const createdPlaylist = await createPlaylist(trackUris);
                      console.log('Created Playlist:', createdPlaylist);
              
                      return createdPlaylist;
                    } catch (error) {
                      console.log('Error:', error);
                      throw error;
                    }
                  }),
                  onDone: {
                    target: 'Reply_playlist',
                    actions: [
                      assign({
                        createdPlaylist_JSON: ({ event }) => event.output, // Store the created playlist information
                      }),
                    ],
                  },
                },
              }, //done
              Reply_playlist: {
                entry: ({ context, spstRef}) => {
                  const createdPlaylist = context.createdPlaylist_JSON;
                  const playlist_container = document.getElementById("playlist_container");
                  playlist_container.style.display = "block";
                  const erase_playlist = document.getElementById("erase_playlist");
                  erase_playlist.style.display = "block";
                  const another_playlist = document.getElementById("another_playlist");
                  another_playlist.style.display = "block";


                  if (createdPlaylist && createdPlaylist.id) {
                    const iframeCode = `
                    <iframe
                      title="Spotify Embed: Recommendation Playlist"
                      src="https://open.spotify.com/embed/playlist/${createdPlaylist.id}"
                      class="playlist-iframe"
                      width="400px"
                      height="800%"
                      
                      style="min-height: 860px; float: left; margin-height: 10px;"
                      frameborder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    ></iframe>
                  `;
                  const square = document.getElementById('playlist_container');
                  square.innerHTML = iframeCode

                  const message = `Here is the created playlist:\n\n`
                  const messageContainer = document.getElementById('message-container');
                  const squareContainer = document.getElementById('square-container');
                  

                  const introTextElement = document.createElement("p");
                  introTextElement.textContent = "HERE IS THE CREATED PLAYLIST:";
                  introTextElement.classList.add("intro-text_3");

                  context.spstRef.send({
                    type: "SPEAK",
                    value: {utterance: "Your plalist has been created"},
                  });
                  } else {
                    context.spstRef.send({
                      type: "SPEAK",
                      value: {utterance: "An error has occurred"},
                    });
                  }
                 },
                 on: {
                  CLICK_CLOSE_PLAYLIST: {target: "Ask"},
                  CLICK_ANOTHER_PLAYLIST: {target: "mood_playlist"},
                },
              },//done
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
document.getElementById("recommendationButton").onclick = () => actor.send({ type: "CLICK_RECOMMENDATION"});
document.getElementById("get_artists_name_ask").onclick = () => actor.send({ type: "CLICK_GET_ARTISTS_NAME_ASK"});
document.getElementById("my_songs").onclick = () => actor.send({ type: "CLICK_MY_SONGS"});
document.getElementById("create_playlist").onclick = () => actor.send({ type: "CLICK_CREATE_PLAYLIST"});
document.getElementById("find_singer").onclick = () => actor.send({ type: "CLICK_FIND_ARTIST"});
document.getElementById("erase_playlist").onclick = () => actor.send({ type: "CLICK_CLOSE_PLAYLIST"});
document.getElementById("reconnect").onclick = () => actor.send({ type: "CLICK_reconnect"});
document.getElementById("another_playlist").onclick = () => actor.send({ type: "CLICK_ANOTHER_PLAYLIST"});


  actor.subscribe((state) => {
  console.log(state.value);
});

