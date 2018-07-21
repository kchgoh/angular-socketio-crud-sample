import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CoreService } from '../core.service';
import { take } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  private responseMessage: string;

  constructor(
    private coreService: CoreService,
    private router: Router ) {
  }

  ngOnInit() {
  }

  onSignIn( evt, userName, password ) {

    evt.preventDefault();
    this.responseMessage = "";

    const loginInfo = {
      userName: userName,
      password: password
    };

    const ob = this.coreService.login( loginInfo );
    ob.pipe(take(1)).subscribe( {
      complete: () => {
        this.router.navigate( ['dashboard'] );
      },
      error: err => {
        this.responseMessage = err;
      }
    } );

  }
}
