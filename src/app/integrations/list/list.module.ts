import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActionModule, ListModule } from 'patternfly-ng';
import { TooltipModule } from 'ngx-bootstrap/tooltip';

import { SyndesisCommonModule } from '../../common/common.module';
import { IntegrationStatusComponent } from '../components/status.component';
import { IntegrationsListComponent } from './list.component';

@NgModule({
  imports: [
    ActionModule,
    CommonModule,
    ListModule,
    SyndesisCommonModule,
    TooltipModule,
  ],
  declarations: [
    IntegrationStatusComponent,
    IntegrationsListComponent,
  ],
  exports: [
    IntegrationsListComponent,
    IntegrationStatusComponent,
  ],
})
export class IntegrationsListModule {
}
