import {Component, ViewEncapsulation} from '@angular/core';

import {Connection} from '../connection.model';
import {ConnectionService} from '../connection.service';

import {Logger} from '../../common/service/log';

var log = Logger.get('+connections/detail');

@Component({
    moduleId: module.id,
    selector: 'connections-detail',
    encapsulation: ViewEncapsulation.None,
    styles: [require('./detail.scss')],
    templateUrl: './detail.html',
    providers: [ ConnectionService ]
})
export class Detail {
    
    connection: Connection;
    errorMessage: string;
    
    constructor(private connectionService: ConnectionService) {}
    
    ngOnInit(): void {
        log.debug('hello `Connections: Detail` component');
    }
    
    save(): void {}
    
    goBack(): void {}
    
}
