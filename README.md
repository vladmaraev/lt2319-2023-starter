**Spotify Voice Controll**

The project aims at developing a voice controlled system powered by Spotify and ChatGPT APIs. 

The system supports the following features:

1. User top songs acquisition.
2. User recommendations acquisition.
3. General and mood-based playlist creation.
4. Artist info acquisition.
5. Song Playback. 


If you wish to run the code, you need to do the following steps:

1. Log in to Spotify for Developers (https://developer.spotify.com) and go to the dashboard and create a new app. Put an app name and redirect URIs to receive an access token. 

2. Open _server.py_ and put the client id and  client secret that the app from the previous step generated. Put the redirect URI that you put in the App in the previous step. 

3. Open _key.py_ and put the client id and the client secret that the app from the previous step generated. Put the redirect URI that you put in the App in the previous step. 
Start _key.py_ and copy paste the link to the browser to obtain an access token. Pass the token to the _keys.ts_ in the spoty const.

4. Obtain a ChatGPT access token and pass it to the _API.ts_ file.

5. Run the program. 





