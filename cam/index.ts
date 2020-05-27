import {AbortController} from '@azure/abort-controller';
import {AzureFunction, Context, HttpRequest} from '@azure/functions';
import {BlobServiceClient, StorageSharedKeyCredential,} from '@azure/storage-blob';
import * as moment from 'moment';
import * as sharp from 'sharp';

const STORAGE_ACCOUNT_NAME = 'scfncentralkrdev02';
const ACCOUNT_ACCESS_KEY =
    '8533ON1hKF0cx58nygDEfuf8IDHMe2EPbbigf+7hDJFnSyD6p6GTeHS5YJ9RYSHcq6BWquutGVKOH9FQo9L2MA==';

const ONE_MINUTE = 60 * 1000;

async function blobstorage(
    deviceID: string, fileName: string, content: string) {
  const containerName = 'cam';
  const blobName = `${deviceID}/${fileName}.jpg`;

  const credentials =
      new StorageSharedKeyCredential(STORAGE_ACCOUNT_NAME, ACCOUNT_ACCESS_KEY);

  const blobServiceClient = new BlobServiceClient(
      `https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`, credentials);

  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);
  const blockBlobClient = blobClient.getBlockBlobClient();

  const aborter = AbortController.timeout(30 * ONE_MINUTE);

  await blockBlobClient.upload(content, content.length, {
    abortSignal: aborter,
  });
}

const httpTrigger: AzureFunction =
    async function(context: Context, req: HttpRequest): Promise<void> {
  context.res = {
    status: 200 /* Defaults to 200 */,
  };
  const deviceID = req.headers.deviceid! as string;
  const rotate = Number(req.headers.rotate);
  const fileName =
      moment().utcOffset('+09:00').format('YYYY/MM/DD/HH:mm:ss.SSS');
  const content = await sharp(req.body).rotate(rotate).toBuffer();
  await blobstorage(deviceID, 'recent', content);
  await blobstorage(deviceID, `file/${fileName}`, content);
};

export default httpTrigger;
