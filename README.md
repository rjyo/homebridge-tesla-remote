# Homebridge-tesla-remote

A [homebridge](https://github.com/nfarina/homebridge) plugin, by which you can control your tesla with Homekit and Siri.

No username or password will be used. Instead you need to generate an access token with [teslams](https://github.com/hjespers/teslams)
  
    teslacmd -u xxx@xxx.com -p xxx --print_token

Install the plugin:

    sudo npm -g install homebridge-tesla-remote

Add the following to config.json:

    {
      "accessories": [
        {
          "accessory": "Tesla",
          "name": "Model S",
          "vin": "XXXXXXX",
          "token": "XXXXXXX",
        }
      ]
    }

## Limits

The temperature won't be return the by the Tesla API sometime.

If you turn off the 'Always Connected' option, it might take a long time before the status are fetched.
