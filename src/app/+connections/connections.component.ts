import {Component, ViewEncapsulation} from '@angular/core';

import {Logger} from '../common/service/log';

var log = Logger.get('+connections');

@Component({
    selector: 'connections',
    encapsulation: ViewEncapsulation.None,
    styles: [],
    template: `<router-outlet></router-outlet>`
})
export class Connections {
    
    constructor() {}
    
    ngOnInit() {
        log.debug('hello `Connections` component');
    }
    
}
