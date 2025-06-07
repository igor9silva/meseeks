export const SkillsAndLoopsFaq = {
	question: 'What are skills? Loops? Compositions?',
	answer: (
		<div className="space-y-3 text-muted-foreground leading-relaxed">
			<p>
				Skills are actions Meseeks can perform. Those can be <strong>soft skills</strong> — decision-making
				powered by AI, or <strong>hard skills</strong> — deterministic API calls using HTTP, MCP and others.
			</p>
			<p>
				<h4>
					<span className="font-semibold">Examples of skills provided by us</span> (a.k.a. Pro-managed):
				</h4>
				<ul className="list-disc pl-5">
					<li>
						<code>searchWeb</code> uses HTTP to search information online using Tavily.
					</li>
					<li>
						<code>instruct</code> uses AI to write task instructions and summarize history.
					</li>
					<li>
						<code>learn</code> uses AI to create knowledge and <strong>update other skills</strong>.
					</li>
				</ul>
			</p>
			<p>And you can add as many skills as you want. Of any kind, using any API.</p>
			<p>
				Meseeks is built on top of a <strong>reaction engine</strong>, where each action performed can trigger a
				re-action. That way you can create a <strong>loop</strong> between skills, and let Meseeks work
				autonomously.
			</p>
			<p>
				<strong>Compositions</strong> are things Meseeks can create. Think of them like ChatGPT's Canvas with
				(lots of) steroids.
			</p>
			<p>
				By leveraging React Components, compositions can power virtually anything.{' '}
				<strong>Web pages, apps, games, slides, 3d stuff, and much much more.</strong> Compositions are still
				very early, and are progressively rolling out to users during research preview.
			</p>
		</div>
	),
};
