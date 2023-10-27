import base64
import requests


client_id = '94febbda162841f7b9130ba4568bc79b' #put your app client id here
client_secret = '77321b467db5465ba4378d0e0b368062' #put your client secret here
redirect_uri = 'http://localhost:8890/callback'  #put the same callback info as in the server.py

# Specify the scopes you want as a space-separated string
scopes = 'user-top-read user-modify-playback-state user-read-currently-playing playlist-modify-public playlist-modify-private'  


credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()


authorization_url = f"https://accounts.spotify.com/authorize" \
                     f"?client_id={client_id}" \
                     f"&redirect_uri={redirect_uri}" \
                     f"&scope={scopes}" \
                     f"&response_type=code"
print(f"Open the following URL in your browser and grant access:\n{authorization_url}")
authorization_code = input("Enter the authorization code from the callback URL: ")

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
else:
    print("Failed to obtain an access token.")
    print(response_data)
