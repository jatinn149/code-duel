import Docker from 'dockerode';
import { logger } from '../../utils/logger';
import { JudgeInfrastructureStatus, healthService } from '../health/health-service';

export class ImageManager {
  private static instance: ImageManager;
  private docker: Docker;

  private constructor() {
    this.docker = new Docker({
      socketPath: process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock',
    });
  }

  public static getInstance(): ImageManager {
    if (!ImageManager.instance) {
      ImageManager.instance = new ImageManager();
    }
    return ImageManager.instance;
  }

  public async ensureImageExists(imageName: string): Promise<boolean> {
    logger.info({ imageName }, 'Checking for required Docker image...');
    
    try {
      const images = await this.docker.listImages({ filters: { reference: [imageName] } });
      
      if (images.length > 0) {
        logger.info({ imageName }, 'Image found locally');
        healthService.updateComponent('DockerImage_' + imageName, JudgeInfrastructureStatus.HEALTHY, 'Image ready');
        return true;
      }

      logger.warn({ imageName }, 'Image not found locally, attempting to pull...');
      healthService.updateComponent('DockerImage_' + imageName, JudgeInfrastructureStatus.DEGRADED, 'Pulling image...');

      return await new Promise((resolve) => {
        this.docker.pull(imageName, (err: Error | null, stream: NodeJS.ReadableStream) => {
          if (err) {
            logger.error({ err, imageName }, 'Failed to initiate image pull');
            healthService.updateComponent('DockerImage_' + imageName, JudgeInfrastructureStatus.OFFLINE, 'Pull failed');
            resolve(false);
            return;
          }

          this.docker.modem.followProgress(stream, onFinished, onProgress);

          function onFinished(err: Error | null, _output: unknown) {
            if (err) {
              logger.error({ err, imageName }, 'Error during image pull');
              healthService.updateComponent('DockerImage_' + imageName, JudgeInfrastructureStatus.OFFLINE, 'Pull error');
              resolve(false);
            } else {
              logger.info({ imageName }, 'Successfully pulled image');
              healthService.updateComponent('DockerImage_' + imageName, JudgeInfrastructureStatus.HEALTHY, 'Image pulled');
              resolve(true);
            }
          }

          function onProgress(_event: unknown) {
            // Optional: log progress periodically if needed
            // logger.debug({ event }, 'Pulling image...');
          }
        });
      });

    } catch (error) {
      logger.error({ error, imageName }, 'Failed to interact with Docker daemon');
      healthService.updateComponent('DockerImage_' + imageName, JudgeInfrastructureStatus.OFFLINE, 'Docker unavailable');
      return false;
    }
  }

  public getDocker(): Docker {
    return this.docker;
  }
}

export const imageManager = ImageManager.getInstance();
