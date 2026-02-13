import { Controller, Post, Get, Body, Query, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GpsService } from './gps.service';

// DTO for Seeworld/GT06 style trackers
interface SeeworldPositionDto {
  imei: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  altitude?: number;
  timestamp?: string;
  status?: string;
}

// Generic GPS data format
interface GpsDataDto {
  imei?: string;
  deviceId?: string;
  latitude?: number;
  lat?: number;
  longitude?: number;
  lng?: number;
  lon?: number;
  speed?: number;
  vitesse?: number;
  heading?: number;
  cap?: number;
  course?: number;
  altitude?: number;
  accuracy?: number;
  timestamp?: string;
  time?: string;
  datetime?: string;
  battery?: number;
  signal?: number;
  gsm?: number;
}

@ApiTags('GPS Webhook')
@Controller('api/gps/webhook')
export class GpsWebhookController {
  private readonly logger = new Logger(GpsWebhookController.name);
  private lastReceivedData: any[] = [];

  constructor(private readonly gpsService: GpsService) {}

  @Get('test')
  @ApiOperation({ summary: 'Test si le webhook est accessible (sans auth)' })
  testWebhook() {
    return {
      status: 'ok',
      message: 'Webhook GPS ACL Platform opérationnel',
      timestamp: new Date().toISOString(),
      endpoints: {
        post: '/api/gps/webhook - Données génériques',
        seeworld: '/api/gps/webhook/seeworld - Format Seeworld',
        batch: '/api/gps/webhook/batch - Plusieurs positions',
      },
      lastReceived: this.lastReceivedData.slice(-5),
    };
  }

  @Get('info')
  @ApiOperation({ summary: 'Instructions pour configurer WhatsGPS' })
  getInfo() {
    return {
      platform: 'ACL Transport GPS Webhook',
      instructions: {
        step1: 'Connectez-vous à www.whatsgps.com',
        step2: 'Allez dans Settings > Data Forward ou API Settings',
        step3: 'Configurez URL: http://VOTRE_IP:3000/api/gps/webhook',
        step4: 'Format: JSON, Méthode: POST',
        step5: 'Activez le transfert de données',
      },
      supportedFormats: ['JSON POST', 'Query parameters', 'Seeworld format'],
      requiredFields: ['imei', 'lat/latitude', 'lng/longitude'],
      optionalFields: ['speed', 'heading/course', 'altitude', 'timestamp'],
    };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook pour recevoir les données GPS (Seeworld, GT06, etc.)' })
  async receivePosition(@Body() data: GpsDataDto, @Query() query: any) {
    this.logger.log(`GPS data received: ${JSON.stringify(data)}`);
    this.logger.log(`Query params: ${JSON.stringify(query)}`);

    try {
      // Extract IMEI (support multiple field names)
      const imei = data.imei || data.deviceId || query.imei || query.deviceId;
      if (!imei) {
        this.logger.warn('No IMEI provided in GPS data');
        return { success: false, error: 'IMEI required' };
      }

      // Extract coordinates (support multiple field names)
      const lat = data.latitude || data.lat || parseFloat(query.lat) || parseFloat(query.latitude);
      const lng = data.longitude || data.lng || data.lon || parseFloat(query.lng) || parseFloat(query.longitude);

      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        this.logger.warn('Invalid coordinates in GPS data');
        return { success: false, error: 'Valid coordinates required' };
      }

      // Extract speed (support multiple field names)
      const speed = data.speed || data.vitesse || parseFloat(query.speed);

      // Extract heading/cap (support multiple field names)
      const heading = data.heading || data.cap || data.course || parseFloat(query.heading);

      // Update position
      await this.gpsService.updatePosition(imei, lat, lng, speed, heading);

      this.logger.log(`Position updated for IMEI ${imei}: ${lat}, ${lng}`);

      // Store for debugging
      this.lastReceivedData.push({
        imei, lat, lng, speed,
        receivedAt: new Date().toISOString(),
      });
      if (this.lastReceivedData.length > 100) {
        this.lastReceivedData = this.lastReceivedData.slice(-50);
      }

      return { success: true, imei, lat, lng };
    } catch (error) {
      this.logger.error(`Error processing GPS data: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @Post('seeworld')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook spécifique Seeworld ImmediatePosition' })
  async receiveSeeworldPosition(@Body() data: SeeworldPositionDto) {
    this.logger.log(`Seeworld data received: ${JSON.stringify(data)}`);

    try {
      if (!data.imei) {
        return { success: false, error: 'IMEI required' };
      }

      await this.gpsService.updatePosition(
        data.imei,
        data.lat,
        data.lng,
        data.speed,
        data.heading,
      );

      return { success: true, imei: data.imei };
    } catch (error) {
      this.logger.error(`Seeworld error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recevoir plusieurs positions en batch' })
  async receiveBatch(@Body() positions: GpsDataDto[]) {
    this.logger.log(`Batch GPS data received: ${positions.length} positions`);

    const results: Array<{ imei: string; success: boolean; error?: string }> = [];
    for (const data of positions) {
      try {
        const imei = data.imei || data.deviceId;
        const lat = data.latitude || data.lat;
        const lng = data.longitude || data.lng || data.lon;
        const speed = data.speed || data.vitesse;
        const heading = data.heading || data.cap || data.course;

        if (imei && lat && lng) {
          await this.gpsService.updatePosition(imei, lat, lng, speed, heading);
          results.push({ imei, success: true });
        } else {
          results.push({ imei: imei || 'unknown', success: false, error: 'Invalid data' });
        }
      } catch (error: any) {
        results.push({ imei: data.imei || 'unknown', success: false, error: error.message });
      }
    }

    return { success: true, processed: results.length, results };
  }
}
