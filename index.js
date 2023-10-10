import { config } from 'dotenv';
import YtDownloader from './YtDownloader.js';

config();

const downloader = new YtDownloader();
downloader.start();