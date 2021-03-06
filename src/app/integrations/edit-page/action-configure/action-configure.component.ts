import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { FormGroup } from '@angular/forms';
import {
  DynamicFormControlModel,
  DynamicFormService,
} from '@ng2-dynamic-forms/core';

import { IntegrationSupportService } from '../../../store/integration-support.service';
import { Action, Step } from '../../../model';
import { CurrentFlow, FlowEvent } from '../current-flow.service';
import { FlowPage } from '../flow-page';
import { FormFactoryService } from '../../../common/forms.service';
import { log, getCategory } from '../../../logging';

const category = getCategory('IntegrationsCreatePage');

@Component({
  selector: 'syndesis-integrations-action-configure',
  templateUrl: 'action-configure.component.html',
  styleUrls: ['./action-configure.component.scss'],
})
export class IntegrationsConfigureActionComponent extends FlowPage
  implements OnInit, OnDestroy {
  routeSubscription: Subscription;
  position: number;
  page: number;
  lastPage: number;
  definition: any;
  action: Action = <Action>{};
  step: Step = <Step>{};
  formModel: DynamicFormControlModel[];
  formGroup: FormGroup;
  formConfig: any;
  loading: boolean;
  error: any = undefined;

  constructor(
    public currentFlow: CurrentFlow,
    public route: ActivatedRoute,
    public router: Router,
    public formFactory: FormFactoryService,
    public formService: DynamicFormService,
    public detector: ChangeDetectorRef,
    public integrationSupport: IntegrationSupportService,
  ) {
    super(currentFlow, route, router, detector);
  }

  goBack() {
    const step = this.currentFlow.getStep(this.position);
    step.action = undefined;
    super.goBack(['action-select', this.position]);
  }

  buildData(data: any) {
    const formValue = this.formGroup ? this.formGroup.value : {};
    return { ...this.step.configuredProperties, ...formValue, ...data };
  }

  previous(data: any = undefined) {
    data = this.buildData(data);
    this.currentFlow.events.emit({
      kind: 'integration-set-properties',
      position: this.position,
      properties: data,
      onSave: () => {
        if (this.page === 0) {
          // all done...
          this.router.navigate(['save-or-add-step'], {
            queryParams: { validate: true },
            relativeTo: this.route.parent,
          });
        } else {
          // go to the next page...
          this.router.navigate(
            ['action-configure', this.position, this.page - 1],
            { relativeTo: this.route.parent },
          );
        }
      },
    });
  }

  continue(data: any = undefined) {
    data = this.buildData(data);
    this.currentFlow.events.emit({
      kind: 'integration-set-properties',
      position: this.position,
      properties: data,
      onSave: () => {
        if (!this.lastPage || this.page >= this.lastPage) {
          // if there are action properties that depend on having other action
          // properties defined in previous steps we need to fetch metadata one
          // more time and apply those action property values that we get
          if (Object.keys(this.step.configuredProperties).length > 0) {
            this.integrationSupport.fetchMetadata(
              this.step.connection,
              this.step.action,
              data,
            )
            .toPromise()
            .then(response => {
              log.debug('Response: ' + JSON.stringify(response, undefined, 2));
              const definition: any = response['_body'] ? JSON.parse(response['_body']) : undefined;
              for (const actionProperty of Object.keys(data)) {
                if (data[actionProperty] == null) {
                  this.step.configuredProperties[actionProperty] = definition.propertyDefinitionSteps.map((actionDefinitionStep) => {
                    return actionDefinitionStep.properties[actionProperty].defaultValue;
                  })[0];
                }
              }
            })
            .catch(response => {
              this.error = {
                message: response.message || response.userMsg || response.developerMsg,
              };
            });
          }

          // all done...
          this.router.navigate(['save-or-add-step'], {
            queryParams: { validate: true },
            relativeTo: this.route.parent,
          });
        } else {
          // go to the next page...
          this.router.navigate(
            ['action-configure', this.position, this.page + 1],
            { relativeTo: this.route.parent },
          );
        }
      },
    });
  }

  initialize(position: number, page: number) {
    this.error = undefined;
    const step = <Step>this.currentFlow.getStep(this.position);
    if (!step) {
      this.router.navigate(['connection-select', this.position], {
        relativeTo: this.route.parent,
      });
      return;
    }
    this.action = step.action;
    this.step = step;

    // TODO use this for the form data instead...
    this.integrationSupport
      .fetchMetadata(
        this.step.connection,
        this.step.action,
        this.configuredPropertiesForMetadataCall(),
      )
      .toPromise()
      .then(response => {
        log.debug('Response: ' + JSON.stringify(response, undefined, 2));
        const definition: any = response['_body']
          ? JSON.parse(response['_body'])
          : undefined;
        this.initForm(position, page, definition);
        this.step.action.inputDataShape = definition.inputDataShape;
        this.step.action.outputDataShape = definition.outputDataShape;
      })
      .catch(response => {
        log.debug('Error response: ' + JSON.stringify(response, undefined, 2));
        try {
          const error = JSON.parse(response['_body']);
          this.initForm(position, page, undefined, error);
        } catch (err) {
          // bailout at this point...
          this.initForm(position, page, undefined, {
            message: response['_body'],
          });
        }
      });
  }

  initForm(position: number, page: number, definition: any, error?: any) {
    if (error) {
      this.error = error;
      this.error.message = error.message || error.userMsg || error.developerMsg;
      this.error.class = 'alert alert-warning';
      this.loading = false;
      this.detector.detectChanges();
      return;
    }
    if (!definition || definition === undefined) {
      this.loading = false;
      // TODO figure out how to get a link in here that works
      this.error = {
        class: 'alert alert-info',
        message: 'There are no properties to configure for this action',
      };
      this.detector.detectChanges();
      setTimeout(() => {
        this.continue({});
      }, 1500);
      return;
    }
    const lastPage = (this.lastPage =
      definition.propertyDefinitionSteps.length - 1);
    if (definition.propertyDefinitionSteps && page <= lastPage) {
      this.definition = JSON.parse(
        JSON.stringify(definition.propertyDefinitionSteps[page]),
      );
      this.formConfig = this.definition.properties;
    } else {
      this.formConfig = {};
    }
    if (!Object.keys(this.formConfig).length) {
      // No configuration, store an empty value and move along to the next page...
      this.continue({});
      return;
    }
    this.formModel = this.formFactory.createFormModel(
      this.formConfig,
      this.step.configuredProperties,
    );
    this.formGroup = this.formService.createFormGroup(this.formModel);
    setTimeout(() => {
      try {
        this.currentFlow.events.emit({
          kind: 'integration-action-configure',
          position: this.position,
        });
        this.loading = false;
        this.detector.detectChanges();
      } catch (err) {}
    }, 30);
  }

  configuredPropertiesForMetadataCall() {
    // fetches all properties from 0..this.position-1 steps, this way
    // the backend does not fix a value and drills down into the detail
    // of the selected value in this.position step, this allows enum
    // values to be present in the same way as they are present when no
    // value is selected by the user
    const props = {};
    const stepDefinitions = this.step.action.definition.propertyDefinitionSteps;
    for (let p = 0; p < this.page; p++) {
      for (const prop in stepDefinitions[p].properties) {
        // we don't want null or undefined values here
        if (this.step.configuredProperties[prop] != null) {
          props[prop] = this.step.configuredProperties[prop];
        }
      }
    }

    return props;
  }

  ngOnInit() {
    this.routeSubscription = this.route.paramMap.subscribe(
      (params: ParamMap) => {
        if (!params.has('page')) {
          this.router.navigate(['0'], { relativeTo: this.route });
          return;
        }
        const page = (this.page = Number.parseInt(params.get('page')));
        const position = (this.position = Number.parseInt(
          params.get('position'),
        ));
        this.loading = true;
        this.initialize(position, page);
      },
    );
  }

  ngOnDestroy() {
    this.routeSubscription.unsubscribe();
  }
}
