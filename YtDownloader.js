import { exec } from 'child_process';
import readline from 'readline';



export default class YtDownloader {
  URL;
  duration;
  links;
  format;
  outputFilename;
  vcodec;
  acodec;

  constructor() {
    this.ytdlp = process.env.YTDLP_PATH || "yt-dlp";
    this.ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
    this.defaultDownloadPath = process.env.DEFAULT_DOWNLOAD_PATH || "";

    this.reading =  readline.createInterface({ input: process.stdin, output: process.stdout });
    
    this.from = null;
    this.to = null;
  };

  inputUrl = async () => {
    this.URL = await new Promise(resolve => this.reading.question(`Please, input URL: `, resolve));
    return this.URL;
  };

  inputFormat = async () => {
    const defaultFormat = `137+140`;
    const questionHeader = `Input you wanted format [${defaultFormat}]: `;
    const input = await new Promise(resolve => this.reading.question(questionHeader, data => resolve(data.trim())));
    this.format = input === '' ? defaultFormat : input;
    return this.format;
  };

  inputFromTo = async () => {
    const defaultFrom = '00:00:00';
    const defaultTo = this.duration;
    const questionHeaderFrom = `Input IN: (HH:MM:SS) [${defaultFrom}]: `;
    const questionHeaderTo = `Input OUT: (HH:MM:SS) [${defaultTo}]: `;
    const inputFrom = await new Promise(resolve => this.reading.question(questionHeaderFrom, data => resolve(data.trim())));
    const inputTo = await new Promise(resolve => this.reading.question(questionHeaderTo, data => resolve(data.trim())));
    if (inputFrom === '' && inputTo === '') return { from: null, to: null };
    this.from = inputFrom !== '' ? inputFrom : defaultFrom;
    this.to = inputTo !== '' ? inputTo : defaultTo;
    return {from: this.from, to: this.to};
  };

  inputVCodec = async () => {
    const defaultVCodec = `copy`;
    const questionHeader = `Video codec (copy, libx264, h264_nvenc etc.) [${defaultVCodec}]: `;
    const input = await new Promise(resolve => this.reading.question(questionHeader, data => resolve(data.trim())));
    this.vcodec = input === '' ? defaultVCodec : input;
    return this.vcodec;
  };
  
  inputACodec = async () => {
    const defaultACodec = `copy`;
    const questionHeader = `Audio codec (copy, aac, ac3 etc.) [${defaultACodec}]: `;
    const input = await new Promise(resolve => this.reading.question(questionHeader, data => resolve(data.trim())));
    this.acodec = input === '' ? defaultACodec : input;
    return this.acodec;
  };
  
  inputOutputFilename = async () => {
    const regex = /[^a-zа-яёії_ -]/ig;
    const defaultFilename = `${this.title.replace(regex, '')}.mp4`;
    const questionHeader = `Output filename [${defaultFilename}]:`;
    const input = await new Promise(resolve => this.reading.question(questionHeader, data => resolve(data.trim())));
    this.outputFilename = input === '' ? defaultFilename : input;
    return this.outputFilename;
  };

  inputDonwloadTo = async () => {
    const downloadTo = this.defaultDownloadPath;
    const questionHeader = `Download to [${downloadTo}]:`;
    const input = await new Promise(resolve => this.reading.question(questionHeader, data => resolve(data.trim())));
    this.downloadTo = input === '' ? downloadTo : input;
    return this.downloadTo;
  };

  formatDuration = (durationStr = '') => {
    const defaultStr = `00:00:00`;
    const sliced = defaultStr.slice(0, -durationStr.length);
    return `${sliced}${durationStr}`
  };

  getInfo = async () => {
    const info = await new Promise((resolve, reject) => {
      const command = `${this.ytdlp} "${this.URL}" --encoding "utf-8" --print %(.{formats_table,duration_string,title,fulltitle,is_live,live_status})+j`;
      console.log(command)
      const running = exec(command);
      let result = ``
      running.stdout.on('data', data => result += data);
      running.on('close', () => resolve(JSON.parse(result)));
      running.on('error', reject);
    });

    const { formats_table, duration_string, title, fulltitle, is_live, live_status } = info;

    this.duration = this.formatDuration(duration_string);
    this.formats_table = formats_table;
    this.title = title;
    this.fulltitle = fulltitle;
    this.is_live = is_live;
    this.live_status = live_status;

    console.log(`\nFORMATS:\n`, this.formats_table);
    console.log(`\nTitle:`, this.title);
    console.log(`\nFull title:`, this.fulltitle);
    console.log(`\nDuration:`, this.duration, '\n');
    console.log(`\Is Live:`, this.is_live, '\n');
    console.log(`\Live status:`, this.live_status, '\n');

    return {
      duration: this.duration, 
      formats_table: this.formats_table,
      title: this.title,
      fulltitle: this.fulltitle,
      is_live: this.is_live,
	    live_status: this.live_status,
    };
  };

  getDownloadLinks = async () => {
    return new Promise((resolve, reject) => {
      let result = ``;
      const command = `${this.ytdlp} -q --get-url --newline "${this.URL}" -f ${this.format}`;
      const running = exec(command);
      running.stdout.on('data', async (data) => result += data);
      //running.stderr.on('data', (data) => console.error(`StdErr while getDownloadLinks:`, data));
      running.on('close', (code) => {
        this.links = result.trim().split('\n');
        console.log(`\nDOWNLOAD LINKS:`);
        this.links.forEach((link, index) => console.log(`[${index+1}] ${link}\n`));
        resolve(this.links);
      });
      running.on('error', reject);
    });
  };

  

  download = async () => {
    return new Promise((resolve, reject) => {
      const from = this.from ? `-ss ${this.from}`: '';
      const to = this.to ? `-to ${this.to}`: '';
      const input = this.links.map(link => `${from} ${to} -i "${link}"`.trim());
      const separatorDownloadTo = this.downloadTo !== '' ? '\\' : '';
      const command = `${this.ffmpeg} ${input.join(' ')} -vcodec ${this.vcodec} -acodec ${this.acodec} -y "${this.downloadTo}${separatorDownloadTo}${this.outputFilename}"`;
      console.log(command);
      const running = exec(command);
      running.on('close', resolve);
      running.on('error', reject);
      running.stdout.on('data', console.log);
      running.stderr.on('data', console.log);
    });
  };

  start = async () => {
    await this.inputUrl();
    await this.getInfo();
    await this.inputFormat();
    await this.inputVCodec();
    await this.inputACodec();
    const links = await this.getDownloadLinks();
    if (!links) throw new Error(`Cannot parse links`);
    await this.inputFromTo();
    await this.inputOutputFilename();
    await this.inputDonwloadTo();
    await this.download();
    this.reading.close();
  };
};
