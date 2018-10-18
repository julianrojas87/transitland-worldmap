const Readable = require('stream').Readable;
const https = require('follow-redirects').https;

class TransitLandFetcher extends Readable {
    constructor(initUri, array) {
        super({ objectMode: true });
        this._initUri = initUri;
        this._nextUri = null;
        this._initPhase = true;
        this._array = array;
    }

    close() {
        this.push(null);
    }

    async _read() {
        try {
            let data = null;

            if (this._initPhase === true) {
                this._initPhase = false;
                data = await this.downloadData(this.initUri);
                this._nextUri = data.meta.next;
                this.push(data[this._array]);
            } else {
                if (this.nextUri && this.nextUri != null) {
                    data = await this.downloadData(this.nextUri);
                    this._nextUri = data.meta.next;
                    this.push(data[this._array]);
                } else {
                    this.push(null);
                }
            }
        } catch (err) {
            console.error(err);
        }
    }

    downloadData(uri) {
        return new Promise((resolve, reject) => {
            let ops = '';
            https.get(uri, response => {
                response.on('data', chunk => {
                    ops = ops.concat(chunk.toString());
                }).on('end', () => {
                    resolve(JSON.parse(ops));
                });
            }).on('error', err => {
                reject(err);
            });
        });
    }

    get initUri() {
        return this._initUri;
    }

    get nextUri() {
        return this._nextUri;
    }
}

module.exports = TransitLandFetcher;