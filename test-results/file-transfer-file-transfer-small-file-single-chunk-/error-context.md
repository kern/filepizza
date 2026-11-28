# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: file-transfer.test.ts >> file transfer: small file (single chunk)
- Location: tests/e2e/file-transfer.test.ts:58:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#copyable-input-long-url')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('#copyable-input-long-url') with timeout 5000ms
  - waiting for locator('#copyable-input-long-url')

```

```yaml
- main:
  - img "Pizza"
  - img "Arrow pointing up"
  - img "FilePizza logo"
  - paragraph: You are uploading 1 file.
  - paragraph: Leave this tab open. FilePizza does not store files.
  - paragraph: test-s-1chunks.txt
  - text: text/plain
  - paragraph: Initializing WebRTC peer...
- contentinfo:
  - paragraph:
    - strong: Like FilePizza v2?
    - text: Support its development!
  - button "Donate"
  - paragraph:
    - text: Cooked up by
    - link "Alex Kern":
      - /url: http://kern.io
    - text: "&"
    - link "Neeraj Baid":
      - /url: https://github.com/neerajbaid
    - text: while eating
    - strong: Sliver
    - text: "@ UC Berkeley ·"
    - link "FAQ":
      - /url: https://github.com/kern/filepizza#faq
    - text: ·
    - link "Fork us":
      - /url: https://github.com/kern/filepizza
- button "Toggle mode":
  - text: Toggle mode
  - img
```

# Test source

```ts
  7   | export interface TestFile {
  8   |   name: string
  9   |   content: string
  10  |   path: string
  11  |   checksum: string
  12  | }
  13  | 
  14  | export function createTestFile(fileName: string, content: string): TestFile {
  15  |   const testFilePath = join(tmpdir(), fileName)
  16  |   writeFileSync(testFilePath, content)
  17  | 
  18  |   const checksum = createHash('sha256').update(content).digest('hex')
  19  | 
  20  |   return {
  21  |     name: fileName,
  22  |     content,
  23  |     path: testFilePath,
  24  |     checksum,
  25  |   }
  26  | }
  27  | 
  28  | export async function uploadFile(
  29  |   page: Page,
  30  |   testFile: TestFile,
  31  | ): Promise<void> {
  32  |   // Navigate to home page
  33  |   await page.goto('http://localhost:3000/')
  34  |   await expect(
  35  |     page.getByText('Peer-to-peer file transfers in your browser.'),
  36  |   ).toBeVisible()
  37  | 
  38  |   // Wait for drop zone button to be ready
  39  |   await expect(page.locator('#drop-zone-button')).toBeVisible()
  40  | 
  41  |   // Upload file using the file input and trigger change event
  42  |   await page.evaluate(
  43  |     ({ testContent, testFileName }) => {
  44  |       const input = document.querySelector(
  45  |         'input[type="file"]',
  46  |       ) as HTMLInputElement
  47  |       if (input) {
  48  |         const file = new File([testContent], testFileName, {
  49  |           type: 'text/plain',
  50  |         })
  51  |         const dataTransfer = new DataTransfer()
  52  |         dataTransfer.items.add(file)
  53  |         input.files = dataTransfer.files
  54  | 
  55  |         // Manually trigger the change event
  56  |         const event = new Event('change', { bubbles: true })
  57  |         input.dispatchEvent(event)
  58  |       }
  59  |     },
  60  |     { testContent: testFile.content, testFileName: testFile.name },
  61  |   )
  62  | 
  63  |   // Wait for file to be processed and confirm upload page to appear
  64  |   await expect(page.getByText(/You are about to start uploading/i)).toBeVisible(
  65  |     { timeout: 10000 },
  66  |   )
  67  | }
  68  | 
  69  | export async function addFile(
  70  |   page: Page,
  71  |   testFile: TestFile,
  72  | ): Promise<void> {
  73  |   await page.evaluate(
  74  |     ({ testContent, testFileName }) => {
  75  |       const input = document.querySelector(
  76  |         '#add-files-input',
  77  |       ) as HTMLInputElement
  78  |       if (input) {
  79  |         const file = new File([testContent], testFileName, {
  80  |           type: 'text/plain',
  81  |         })
  82  |         const dataTransfer = new DataTransfer()
  83  |         dataTransfer.items.add(file)
  84  |         input.files = dataTransfer.files
  85  | 
  86  |         const event = new Event('change', { bubbles: true })
  87  |         input.dispatchEvent(event)
  88  |       }
  89  |     },
  90  |     { testContent: testFile.content, testFileName: testFile.name },
  91  |   )
  92  | 
  93  |   await expect(page.getByText(testFile.name)).toBeVisible({ timeout: 5000 })
  94  | }
  95  | 
  96  | export async function startUpload(page: Page): Promise<string> {
  97  |   // Start sharing
  98  |   await page.locator('#start-button').click()
  99  | 
  100 |   // Wait for uploading state and get the share URL
  101 |   await expect(page.getByText(/You are uploading/i)).toBeVisible({
  102 |     timeout: 10000,
  103 |   })
  104 | 
  105 |   // Get the share URL from the copyable input (Long URL)
  106 |   const shareUrlInput = page.locator('#copyable-input-long-url')
> 107 |   await expect(shareUrlInput).toBeVisible({ timeout: 5000 })
      |                               ^ Error: expect(locator).toBeVisible() failed
  108 |   const shareUrl = await shareUrlInput.inputValue()
  109 | 
  110 |   expect(shareUrl).toMatch(/http:\/\/localhost:3000\//)
  111 |   return shareUrl
  112 | }
  113 | 
  114 | export async function downloadFile(
  115 |   page: Page,
  116 |   shareUrl: string,
  117 |   testFile: TestFile,
  118 | ): Promise<string> {
  119 |   // Navigate to share URL
  120 |   await page.goto(shareUrl)
  121 | 
  122 |   // Wait for download page to load
  123 |   await expect(page.getByText(testFile.name)).toBeVisible({
  124 |     timeout: 10000,
  125 |   })
  126 | 
  127 |   // Start download
  128 |   const downloadPromise = page.waitForEvent('download')
  129 |   await page.locator('#download-button').click()
  130 |   const download = await downloadPromise
  131 | 
  132 |   // Verify download
  133 |   expect(download.suggestedFilename()).toBe(testFile.name)
  134 | 
  135 |   // Save downloaded file
  136 |   const downloadPath = join(tmpdir(), `downloaded-${testFile.name}`)
  137 |   await download.saveAs(downloadPath)
  138 | 
  139 |   return downloadPath
  140 | }
  141 | 
  142 | export async function verifyFileIntegrity(
  143 |   downloadPath: string,
  144 |   testFile: TestFile,
  145 | ): Promise<void> {
  146 |   // Verify downloaded content and checksum
  147 |   const downloadedContent = readFileSync(downloadPath, 'utf8')
  148 |   expect(downloadedContent).toBe(testFile.content)
  149 | 
  150 |   const downloadedChecksum = createHash('sha256')
  151 |     .update(downloadedContent)
  152 |     .digest('hex')
  153 |   expect(downloadedChecksum).toBe(testFile.checksum)
  154 | }
  155 | 
  156 | export async function verifyTransferCompletion(
  157 |   downloaderPage: Page,
  158 | ): Promise<void> {
  159 |   // Verify download completion on downloader side
  160 |   await expect(downloaderPage.getByText(/You downloaded/i)).toBeVisible({
  161 |     timeout: 10000,
  162 |   })
  163 | }
  164 | 
  165 | export async function createBrowserContexts(browser: Browser): Promise<{
  166 |   uploaderPage: Page
  167 |   downloaderPage: Page
  168 |   cleanup: () => Promise<void>
  169 | }> {
  170 |   const uploaderContext = await browser.newContext()
  171 |   const downloaderContext = await browser.newContext()
  172 | 
  173 |   const uploaderPage = await uploaderContext.newPage()
  174 |   const downloaderPage = await downloaderContext.newPage()
  175 | 
  176 |   const cleanup = async () => {
  177 |     await uploaderContext.close()
  178 |     await downloaderContext.close()
  179 |   }
  180 | 
  181 |   return { uploaderPage, downloaderPage, cleanup }
  182 | }
  183 | 
  184 | export interface ProgressMonitor {
  185 |   uploaderProgress: number
  186 |   downloaderProgress: number
  187 |   maxProgress: number
  188 | }
  189 | 
  190 | export interface ChunkProgressLog {
  191 |   chunkNumber: number
  192 |   fileName: string
  193 |   offset: number
  194 |   end: number
  195 |   fileSize: number
  196 |   final: boolean
  197 |   progressPercentage: number
  198 |   side: 'upload' | 'download'
  199 | }
  200 | 
  201 | export interface PreciseChunkMonitor {
  202 |   uploadChunks: ChunkProgressLog[]
  203 |   downloadChunks: ChunkProgressLog[]
  204 | }
  205 | 
  206 | export async function monitorChunkProgress(
  207 |   uploaderPage: Page,
```