import { AppPage } from './app.po';

describe('workspace-project App', () => {
  let page: AppPage;

  beforeEach(() => {
    page = new AppPage();
  });

  it('should display login page on start', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('Please sign in');
  });
});
