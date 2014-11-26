## Usage

- Clone the repository using ```git clone https://github.com/wyozi/gmusic-player2.git```  
- Run ```npm install``` in the cloned folder to get node dependencies  
- Run ```bower install``` in the cloned folder to get bower dependencies  
- Get https://github.com/rogerwang/node-webkit  
- Apply the fix at [https://github.com/rogerwang/node-webkit/wiki/Using-MP3-&-MP4-%28H.264%29-using-the--video--&--audio--tags.](https://github.com/rogerwang/node-webkit/wiki/Using-MP3-&-MP4-%28H.264%29-using-the--video--&--audio--tags.)
- Create a "credentials.txt" file in the root folder of gmusic-player2 project, which should look like this:
```
{
    "email": "my@email.com",
    "password": "password
}
```
- Run ```nw .``` inside the gmusic-player2 folder (assuming node-webkit is on your PATH)
