import createTesla from './createTesla'

module.exports = function register(homebridge) {
  const Service = homebridge.hap.Service
  const Characteristic = homebridge.hap.Characteristic
  homebridge.registerAccessory('homebridge-tesla', 'Tesla', createTesla({
    Service,
    Characteristic,
  }));
}