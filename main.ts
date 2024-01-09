import axios from "axios";
import mqtt from "mqtt";
import fs from "fs";
import dotenv from "dotenv";
import {Protocol, convertToCp1251, EffectType, Direction, Position} from "./signage/protocol";

dotenv.config();

const CA_CERTIFICATE_PATH = process.env.CA_CERTIFICATE_PATH ?? 'ca-cert.pem';
const MESSAGE_LENGTH_LIMIT = parseInt(process.env.MESSAGE_LENGTH_LIMIT ?? '150');
const MQTT_URL = process.env.MQTT_URL ?? 'mqtts://b4ck:b4ck@mqtt.internal.0x08.in'

async function getRandomBanek(): Promise<string> {
    const response = await axios.get('https://baneks.ru/random');
    const anek = /<article>(\s+)<h2>(.*?)<\/h2>(\s+)<p>(.*?)<\/p>(\s+)<\/article>/gi
        .exec(response.data.replace(/\n/gi, ' '))![4]
        .replace(/<br\/> /gi, '\n');
    return anek;
}

async function getAnek(): Promise<string> {
    let resultText;

    do {
        const anek = (await getRandomBanek())
            .replace(/—/gi, '-')
            .replace(/…/gi, '...')
            .replace(/\n/gi, ' ')
            .replace(/[^A-Za-zА-Яа-яёЁ.!?\-,"'0-9: ]/gi, '');

        if (anek.length <= MESSAGE_LENGTH_LIMIT) {
            resultText = anek;
        }
    } while (!resultText);

    return resultText;
}

const client = mqtt.connect(MQTT_URL, {
    ca: [fs.readFileSync(CA_CERTIFICATE_PATH)]
});

client.on('connect', () => {
    console.info('Connected to mqtt');
});
client.on('error', e => {
    console.error(`Error: ${e}`);
})

const protocol = new Protocol();

function sendAnek() {
    getAnek()
        .then(anek => {
            client.publish('bus/devices/openspace-signage/message', Buffer.from(protocol.serializeSetMessage({
                message: {
                    data: convertToCp1251(anek),
                    brightness: 4,
                    effectType: EffectType.SCROLL,
                    scrollEffect: {
                        direction: Direction.RIGHT_TO_LEFT,
                        speed: 50
                    }
                },
                duration: 30000,
                priority: 1
            })));
            console.info('Anek sent');
        })
        .catch(e => {
            console.error(e);
        });
}

setInterval(sendAnek, 120000);
sendAnek();