import base64
import requests
from flask import Flask, request
import urllib.parse  

# Spotify API credentials
client_id = '' #app client id
client_secret = '' #put your client secret from the app here
redirect_uri = ''  #put your callback url here


scopes = 'user-top-read user-modify-playback-state user-read-currently-playing playlist-modify-public playlist-modify-private'  # Add  scopes as needed


credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()


app = Flask(__name__)

@app.route('/callback')
def callback():
    authorization_code = request.args.get('code')
    
    
    token_url = "https://accounts.spotify.com/api/token"
    headers = {
        "Authorization": f"Basic {credentials}"
    }
    data = {
        "grant_type": "authorization_code",
        "code": authorization_code,
        "redirect_uri": redirect_uri
    }
    response = requests.post(token_url, headers=headers, data=data)
    response_data = response.json()

    if response.status_code == 200:
        access_token = response_data["access_token"]
        print(f"Access Token: {access_token}")
        return f"Access Token: {access_token}"
    else:
        return "Failed to obtain an access token."

if __name__ == '__main__':
    
    authorization_url = f"https://accounts.spotify.com/authorize" \
                         f"?client_id={client_id}" \
                         f"&redirect_uri={urllib.parse.quote(redirect_uri)}" \
                         f"&scope={urllib.parse.quote(scopes)}" \
                         f"&response_type=code"
    
    print(f"Open the following URL in your browser and grant access:\n{authorization_url}")
    app.run(port=8890)  # Change the port if needed
