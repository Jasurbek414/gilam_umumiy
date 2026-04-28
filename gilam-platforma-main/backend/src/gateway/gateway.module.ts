import { Module, forwardRef } from '@nestjs/common';
import { CallsGateway } from './calls.gateway';
import { SipBridgeGateway } from './sip-bridge.gateway';
import { CallsModule } from '../calls/calls.module';

@Module({
  imports: [forwardRef(() => CallsModule)],
  providers: [CallsGateway /*, SipBridgeGateway */],
  exports: [CallsGateway /*, SipBridgeGateway */],
})
export class GatewayModule {}
