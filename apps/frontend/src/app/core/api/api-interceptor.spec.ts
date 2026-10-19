import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL, apiInterceptor } from './api-interceptor';

describe('apiInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://api.test' },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('sends /api requests to the API origin with the session cookie', () => {
    http.get('/api/restaurants').subscribe();

    const req = httpTesting.expectOne('http://api.test/api/restaurants');
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });

  it('leaves the other requests unchanged', () => {
    http.get('/assets/data.json').subscribe();

    const req = httpTesting.expectOne('/assets/data.json');
    expect(req.request.withCredentials).toBe(false);
    req.flush({});
  });
});
